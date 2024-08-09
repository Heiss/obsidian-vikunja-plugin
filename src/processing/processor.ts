import Plugin from "../../main";
import {App, MarkdownView, moment, Notice, TFile} from "obsidian";
import {PluginTask, VaultSearcher} from "../vaultSearcher/vaultSearcher";
import {TaskFormatter, TaskParser} from "../taskFormats/taskFormats";
import {Automaton, AutomatonStatus} from "./automaton";
import {EmojiTaskFormatter, EmojiTaskParser} from "../taskFormats/emojiTaskFormat";
import {backendToFindTasks, chooseOutputFile, supportedTasksPluginsFormat} from "../enums";
import {DataviewSearcher} from "../vaultSearcher/dataviewSearcher";
import {ModelsTask} from "../../vikunja_sdk";
import {
	appHasDailyNotesPluginLoaded,
	createDailyNote,
	getAllDailyNotes,
	getDailyNote
} from "obsidian-daily-notes-interface";


class Processor {
	app: App;
	plugin: Plugin;
	vaultSearcher: VaultSearcher;
	taskParser: TaskParser;
	taskFormatter: TaskFormatter;
	private alreadyUpdateTasksOnStartup = false;
	private lastLineChecked: Map<string, number>;
	private automaton: Automaton;

	constructor(app: App, plugin: Plugin) {
		this.app = app;
		this.plugin = plugin;

		this.vaultSearcher = this.getVaultSearcher();
		this.taskParser = this.getTaskParser();
		this.taskFormatter = this.getTaskFormatter();

		this.lastLineChecked = new Map<string, number>();
	}

	/*
	* The main method to sync tasks between Vikunja and Obsidian.
	 */
	async exec() {
		if (this.plugin.settings.debugging) console.log("Processor: Start processing");

		if (this.plugin.commands.isEverythingSetup()) {
			new Notice("Vikunja Plugin: Found problems in plugin. Have to be fixed first. Syncing is stopped.");
			if (this.plugin.settings.debugging) console.log("Processor: Found problems in plugin. Have to be fixed first.");
			return;
		}

		// Check if user is logged in
		if (!this.plugin.userObject) {
			// FIXME Currently cannot be used, because there is a bug in Vikunja, which returns 401 in api to get the user object.
			//this.plugin.userObject = await new User(this.app, this.plugin).getUser();
		}

		if (this.plugin.settings.debugging) console.log("Processor: Reset automaton");
		this.automaton = new Automaton(this.app, this.plugin, this);

		await this.automaton.run();

		switch (this.automaton.status) {
			case AutomatonStatus.ERROR:
				new Notice("Error while syncing tasks");
				break;
			case AutomatonStatus.FINISHED:
				new Notice("Finished syncing tasks");
				break;
		}

		if (this.plugin.settings.debugging) console.log("Processor: End processing");
	}

	async saveToVault(task: PluginTask) {
		const newTask = this.getTaskContent(task);

		const file = this.app.vault.getFileByPath(task.filepath);
		if (file === null) {
			return;
		}
		await this.app.vault.process(file, data => {
			let content;
			if (this.plugin.settings.appendMode) {
				content = data + "\n" + newTask;
			} else {
				const lines = data.split("\n");
				for (let i = 0; i < lines.length; i++) {
					if (lines[i].includes(this.plugin.settings.insertAfter)) {
						lines.splice(i + 1, 0, newTask);
						break;
					}
				}
				content = lines.join("\n");
			}
			this.plugin.cache.update(task);
			return content;
		});
	}

	getTaskContent(task: PluginTask): string {
		const content: string = this.taskFormatter.format(task.task);
		return `${content} `;
	}

	getTaskContentWithoutVikunja(task: PluginTask): string {
		const content: string = this.taskFormatter.formatRaw(task.task);
		return `${content} `;
	}


	/*
	 * Split tasks into two groups:
	 * - tasksToUpdateInVault: Tasks which have updates in Vikunja
	 * - tasksToUpdateInVikunja: Tasks which have updates in the vault
	 *
	 * tasksToUpdateInVault has already all informations needed for vault update.
	 *
	 * This method should only be triggered on startup of obsidian and only once. After this, we cannot guerantee that the updated information of files are in sync.
	 */
	async updateTasksOnStartup() {
		if (!this.plugin.settings.updateOnStartup) {
			if (this.plugin.settings.debugging) console.log("Processor: Update on startup is disabled");
			return;
		}
		if (this.alreadyUpdateTasksOnStartup) throw new Error("Update tasks on startup can only be called once");
		if (this.plugin.settings.debugging) console.log("Processor: Update tasks in vault and vikunja");

		await this.exec();
		this.alreadyUpdateTasksOnStartup = true;
	}

	/*
	 * Check if an update is available in the line, where the cursor is currently placed, which should be pushed to Vikunja
	 */
	async checkUpdateInLineAvailable(): Promise<PluginTask | undefined> {
		if (!this.plugin.settings.updateOnCursorMovement) {
			if (this.plugin.settings.debugging) console.log("Processor: Update on cursor movement is disabled");
			return;
		}

		const view = this.app.workspace.getActiveViewOfType(MarkdownView)
		if (!view) {
			if (this.plugin.settings.debugging) console.log("Processor: No markdown view found");
			return;
		}

		const cursor = view.app.workspace.getActiveViewOfType(MarkdownView)?.editor.getCursor()

		const currentFilename = view.app.workspace.getActiveViewOfType(MarkdownView)?.app.workspace.activeEditor?.file?.name;
		if (!currentFilename) {

			if (this.plugin.settings.debugging) console.log("Processor: No filename found");
			return;
		}

		const currentLine = cursor?.line
		if (!currentLine) {
			if (this.plugin.settings.debugging) console.log("Processor: No line found");
			return;
		}

		const file = view.file;
		if (!file) {
			if (this.plugin.settings.debugging) console.log("Processor: No file found");
			return;
		}

		const lastLine = this.lastLineChecked.get(currentFilename);
		let updatedTask = undefined;
		if (!!lastLine) {
			const lastLineText = view.editor.getLine(lastLine);
			if (this.plugin.settings.debugging) console.log("Processor: Last line,", lastLine, "Last line text", lastLineText);
			try {
				const parsedTask = await this.taskParser.parse(lastLineText);
				updatedTask = new PluginTask(file.path, lastLine, parsedTask);
				if (updatedTask.task.id === undefined) {
					return;
				}
				const cacheTask = this.plugin.cache.get(updatedTask.task.id);
				if (cacheTask === undefined) {
					if (this.plugin.settings.debugging) console.error("Processor: Should not be here, because if this task is not in cache, but has an id, it circumvented the cache.")
					return;
				}
				await this.plugin.tasksApi.updateTask(updatedTask);
			} catch (e) {
				if (this.plugin.settings.debugging) console.log("Processor: Error while parsing task", e);
			}
		}

		this.lastLineChecked.set(currentFilename, currentLine);
		return updatedTask;
	}

	/* Update a task in the vault
	* If the second parameter set to false, the vikunja metadata will not entered. But per default, the metadata will be entered.
	*/
	async updateToVault(task: PluginTask, metadata: boolean = true) {
		const newTask = (metadata) ? this.getTaskContent(task) : this.getTaskContentWithoutVikunja(task);
		const file = this.app.vault.getFileByPath(task.filepath);
		if (file === null) {
			return;
		}
		await this.app.vault.process(file, (data: string) => {
			const lines = data.split("\n");
			lines.splice(task.lineno, 1, newTask);
			return lines.join("\n");
		});

		try {
			this.plugin.cache.update(task);
		} catch (e) {
			if (metadata) {
				// raise error again, if metadata was wanted! otherwise it is expected, that update will fail, because id is missing.
				throw e;
			}
		}
	}

	async removeFromVault(task: PluginTask) {
		const file = this.app.vault.getFileByPath(task.filepath);
		if (file === null) {
			return;
		}
		await this.app.vault.process(file, (data: string) => {
			const lines = data.split("\n");
			lines.splice(task.lineno, 1);
			return lines.join("\n");
		});
		if (task.task.id === undefined) {
			throw new Error("Task id is not defined");
		}
		this.plugin.cache.delete(task.task.id);
	}

	getVaultSearcher(): VaultSearcher {
		let vaultSearcher: VaultSearcher;
		switch (this.plugin.settings.backendToFindTasks) {
			case backendToFindTasks.Dataview:
				// Prepare dataview
				vaultSearcher = new DataviewSearcher(this.app, this.plugin);
				break;
			default:
				throw new Error("No valid backend to find tasks in vault selected");
		}
		return vaultSearcher;
	}

	getTaskFormatter(): EmojiTaskFormatter {
		switch (this.plugin.settings.useTasksFormat) {
			case supportedTasksPluginsFormat.Emoji:
				return new EmojiTaskFormatter(this.app, this.plugin);
			default:
				throw new Error("No valid TaskFormat selected");
		}
	}

	getTaskParser() {
		let taskParser: TaskParser;
		switch (this.plugin.settings.useTasksFormat) {
			case supportedTasksPluginsFormat.Emoji:
				taskParser = new EmojiTaskParser(this.app, this.plugin);
				break;
			default:
				throw new Error("No valid TaskFormat selected");
		}
		return taskParser;
	}

	async pushTasksFromVaultToVikunja(localTasks: PluginTask[], vikunjaTasks: ModelsTask[]) {
		const tasksToPushToVikunja = localTasks.filter(task => !vikunjaTasks.find(vikunjaTask => vikunjaTask.id === task.task.id));
		if (this.plugin.settings.debugging) console.log("Step CreateTask: Pushing tasks to Vikunja and updates in Vault")
		await Promise.all(tasksToPushToVikunja.map(task => this.createTaskAndUpdateToVault(task)));
	}

	async pullTasksFromVikunjaToVault(localTasks: PluginTask[], vikunjaTasks: ModelsTask[]) {
		if (this.plugin.settings.debugging) console.log("Step CreateTask: Pulling tasks from vikunja to vault, vault tasks", localTasks, "vikunja tasks", vikunjaTasks);

		const tasksToPushToVault = vikunjaTasks.filter(task => !localTasks.find(vaultTask => vaultTask.task.id === task.id));
		if (this.plugin.settings.debugging) console.log("Step CreateTask: Pushing tasks to vault", tasksToPushToVault);

		const createdTasksInVault: PluginTask[] = [];
		for (const task of tasksToPushToVault) {
			let file: TFile;
			const chosenFile = this.app.vault.getFileByPath(this.plugin.settings.chosenOutputFile);
			const formattedDate = task.created;
			let date = moment();
			if (formattedDate !== undefined) {
				if (this.plugin.settings.debugging) console.log("Step CreateTask: Found formatted date", formattedDate, "using it as daily note");
				date = moment(formattedDate, "YYYY-MM-DDTHH:mm:ss[Z]");
			}
			const dailies = getAllDailyNotes()

			switch (this.plugin.settings.chooseOutputFile) {
				case chooseOutputFile.File:
					if (!chosenFile) throw new Error("Output file not found");
					file = chosenFile;
					break;
				case chooseOutputFile.DailyNote:
					if (!appHasDailyNotesPluginLoaded()) {
						new Notice("Daily notes core plugin is not loaded. So we cannot create daily note. Please install daily notes core plugin. Interrupt now.")
						continue;
					}

					file = getDailyNote(date, dailies)
					if (file == null) {
						file = await createDailyNote(date)
					}
					break;
				default:
					throw new Error("No valid chooseOutputFile selected");
			}
			const pluginTask = new PluginTask(file.path, 0, task);
			createdTasksInVault.push(pluginTask);
		}

		for (const task of createdTasksInVault) {
			await this.saveToVault(task);
		}
	}

	private async createTaskAndUpdateToVault(task: PluginTask) {
		if (this.plugin.settings.debugging) console.log("Step CreateTask: Pushing task to vikunja", task);
		task.task = await this.plugin.tasksApi.createTask(task.task);
		if (this.plugin.settings.debugging) console.log("Step CreateTask: Update task in Vault ", task);

		try {
			await this.updateToVault(task);
		} catch (e) {
			console.error("Error while updating task in vault", e);
			// transaction to update task in vault, see #9
			await this.plugin.tasksApi.deleteTask(task.task);
		}
	}
}

function compareModelTasks(local: ModelsTask, vikunja: ModelsTask): boolean {
	const title = local.title === vikunja.title;
	const description = local.description === vikunja.description;
	const dueDate = local.dueDate === vikunja.dueDate;
	const labels = local.labels?.filter(label => vikunja.labels?.find(vikunjaLabel => vikunjaLabel.title === label.title)).length === local.labels?.length;
	const priority = local.priority === vikunja.priority;
	const status = local.done === vikunja.done;
	const doneAt = local.doneAt === vikunja.doneAt;
	const updated = local.updated === vikunja.updated;

	return title && description && dueDate && labels && priority && status && doneAt && updated;
}

export {Processor, compareModelTasks};
