import Plugin from "../../main";
import {App, MarkdownView, moment, Notice, TFile} from "obsidian";
import {PluginTask, VaultSearcher} from "../vaultSearcher/vaultSearcher";
import {TaskFormatter, TaskParser} from "../taskFormats/taskFormats";
import {Automaton, AutomatonStatus, IAutomatonSteps} from "./automaton";
import UpdateTasks from "./updateTasks";
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

		await this.app.vault.process(task.file, data => {
			if (this.plugin.settings.appendMode) {
				return data + "\n" + newTask;
			} else {
				const lines = data.split("\n");
				for (let i = 0; i < lines.length; i++) {
					if (lines[i].includes(this.plugin.settings.insertAfter)) {
						lines.splice(i + 1, 0, newTask);
						break;
					}
				}
				return lines.join("\n");
			}
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
		if (this.plugin.settings.debugging) console.log("Processor: Update tasks in vault and vikunja");
		if (this.alreadyUpdateTasksOnStartup) throw new Error("Update tasks on startup can only be called once");
		if (this.plugin.commands.isEverythingSetup()) {
			if (this.plugin.settings.debugging) console.log("Processor: Found problems in plugin. Have to be fixed first. Syncing is stopped.");
			return;
		}
		if (!this.plugin.settings.updateOnStartup) {
			if (this.plugin.settings.debugging) console.log("Processor: Update on startup is disabled");
			return;
		}

		const localTasks = await this.vaultSearcher.getTasks(this.taskParser);
		const vikunjaTasks = await this.plugin.tasksApi.getAllTasks();

		const updateStep: IAutomatonSteps = new UpdateTasks(this.app, this.plugin, this);
		await updateStep.step(localTasks, vikunjaTasks);

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
		let pluginTask = undefined;
		if (!!lastLine) {
			const lastLineText = view.editor.getLine(lastLine);
			if (this.plugin.settings.debugging) console.log("Processor: Last line,", lastLine, "Last line text", lastLineText);
			try {
				const parsedTask = await this.taskParser.parse(lastLineText);
				pluginTask = {
					file: file,
					lineno: lastLine,
					task: parsedTask
				};
			} catch (e) {
				if (this.plugin.settings.debugging) console.log("Processor: Error while parsing task", e);
			}
		}

		this.lastLineChecked.set(currentFilename, currentLine);
		return pluginTask;
	}

	/* Update a task in the vault
	* If the second parameter set to false, the vikunja metadata will not entered. But per default, the metadata will be entered.
	*/
	async updateToVault(task: PluginTask, metadata: boolean = true) {
		const newTask = (metadata) ? this.getTaskContent(task) : this.getTaskContentWithoutVikunja(task);

		await this.app.vault.process(task.file, (data: string) => {
			const lines = data.split("\n");
			lines.splice(task.lineno, 1, newTask);
			return lines.join("\n");
		});
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
			// FIXME This should be the date of the vikunja created date, so the task is created in the correct daily note
			const date = moment();
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
			const pluginTask: PluginTask = {
				file: file,
				lineno: 0,
				task: task
			};
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

export {Processor};
