import Plugin from "../../main";
import {App, MarkdownView, moment, Notice, TFile} from "obsidian";
import {backendToFindTasks, chooseOutputFile, supportedTasksPluginsFormat} from "../enums";
import {PluginTask, VaultSearcher} from "../vaultSearcher/vaultSearcher";
import {DataviewSearcher} from "../vaultSearcher/dataviewSearcher";
import {TaskFormatter, TaskParser} from "../taskFormats/taskFormats";
import {EmojiTaskFormatter, EmojiTaskParser} from "../taskFormats/emojiTaskFormat";
import {ModelsTask} from "../../vikunja_sdk";
import {
	appHasDailyNotesPluginLoaded,
	createDailyNote,
	getAllDailyNotes,
	getDailyNote
} from "obsidian-daily-notes-interface";

interface UpdatedSplit {
	tasksToUpdateInVault: PluginTask[];
	tasksToUpdateInVikunja: PluginTask[];
}

class Processor {
	app: App;
	plugin: Plugin;
	vaultSearcher: VaultSearcher;
	taskParser: TaskParser;
	taskFormatter: TaskFormatter;
	private alreadyUpdateTasksOnStartup = false;
	private lastLineChecked: Map<string, number>;

	constructor(app: App, plugin: Plugin) {
		this.app = app;
		this.plugin = plugin;

		this.vaultSearcher = this.getVaultSearcher();
		this.taskParser = this.getTaskParser();
		this.taskFormatter = this.getTaskFormatter();
		this.lastLineChecked = new Map<string, number>();
	}


	async exec() {
		if (this.plugin.settings.debugging) console.log("Processor: Start processing");
		if (this.plugin.foundProblem) {
			new Notice("Vikunja Plugin: Found problems in plugin. Have to be fixed first. Syncing is stopped.");
			if (this.plugin.settings.debugging) console.log("Processor: Found problems in plugin. Have to be fixed first.");
			return;
		}

		// Check if user is logged in
		if (!this.plugin.userObject) {
			// FIXME Currently cannot be used, because there is a bug in Vikunja, which returns 401 in api to get the user object.
			//this.plugin.userObject = await new User(this.app, this.plugin).getUser();
		}

		// Get all tasks in vikunja and vault
		if (this.plugin.settings.debugging) console.log("Processor: Pulling tasks from vault");
		let localTasks = await this.vaultSearcher.getTasks(this.taskParser);
		if (this.plugin.settings.debugging) console.log("Processor: Got tasks from vault", localTasks);

		if (this.plugin.settings.debugging) console.log("Processor: Pulling tasks from Vikunja");
		const vikunjaTasksBeforeDeletion = await this.plugin.tasksApi.getAllTasks();
		if (this.plugin.settings.debugging) console.log("Processor: Got tasks from Vikunja", vikunjaTasksBeforeDeletion);

		const {
			tasksToUpdateInVault,
			tasksToUpdateInVikunja
		} = this.splitTaskAfterUpdatedStatus(localTasks, vikunjaTasksBeforeDeletion);
		if (this.plugin.settings.debugging) console.log("Processor: Split tasks after updated status, outstanding updates in vault", tasksToUpdateInVault, "outstanding updates in vikunja", tasksToUpdateInVikunja);

		// Processing steps
		if (this.plugin.settings.debugging) console.log("Processor: Deleting tasks and labels in Vikunja");
		const deletedVikunjaTasks = await this.removeTasksInVikunjaIfNotInVault(localTasks, vikunjaTasksBeforeDeletion);
		await this.removeLabelsInVikunjaIfNotInVault(localTasks, vikunjaTasksBeforeDeletion);
		// Filter out deleted tasks
		const vikunjaTasks = vikunjaTasksBeforeDeletion.filter(task => !deletedVikunjaTasks.find(deletedTask => deletedTask.id === task.id));

		if (this.plugin.settings.debugging) console.log("Processor: Creating labels in Vikunja", localTasks);
		localTasks = await this.createLabels(localTasks);

		if (this.plugin.settings.debugging) console.log("Processor: Creating tasks in Vikunja and vault", localTasks, vikunjaTasks);
		await this.pullTasksFromVikunjaToVault(localTasks, vikunjaTasks);
		await this.pushTasksFromVaultToVikunja(localTasks, vikunjaTasks);

		if (this.plugin.settings.debugging) console.log("Processor: Updating tasks in vault and Vikunja");
		await this.updateTasksInVikunja(tasksToUpdateInVikunja);
		await this.updateTasksInVault(tasksToUpdateInVault);

		if (this.plugin.settings.debugging) console.log("Processor: End processing");
	}

	async getTaskContent(task: PluginTask) {
		const content: string = await this.taskFormatter.format(task.task);
		return `${content} `;
	}

	async updateToVault(task: PluginTask) {
		const newTask = await this.getTaskContent(task);

		await this.app.vault.process(task.file, data => {
			const lines = data.split("\n");
			lines.splice(task.lineno, 1, newTask);
			return lines.join("\n");
		});
	}

	async saveToVault(task: PluginTask) {
		const newTask = await this.getTaskContent(task);

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

	getTaskFormatter(): EmojiTaskFormatter {
		switch (this.plugin.settings.useTasksFormat) {
			case supportedTasksPluginsFormat.Emoji:
				return new EmojiTaskFormatter(this.app, this.plugin);
			default:
				throw new Error("No valid TaskFormat selected");
		}
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
		if (this.plugin.foundProblem) {
			if (this.plugin.settings.debugging) console.log("Processor: Found problems in plugin. Have to be fixed first. Syncing is stopped.");
			return;
		}
		if (!this.plugin.settings.updateOnStartup) {
			if (this.plugin.settings.debugging) console.log("Processor: Update on startup is disabled");
			return;
		}

		const localTasks = await this.vaultSearcher.getTasks(this.taskParser);
		const vikunjaTasks = await this.plugin.tasksApi.getAllTasks();

		const {
			tasksToUpdateInVault,
			tasksToUpdateInVikunja
		} = this.splitTaskAfterUpdatedStatus(localTasks, vikunjaTasks);


		await this.updateTasksInVault(tasksToUpdateInVault);
		await this.updateTasksInVikunja(tasksToUpdateInVikunja);

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

	private async createLabels(localTasks: PluginTask[]) {
		return await Promise.all(localTasks
			.map(async task => {
					if (!task.task) throw new Error("Task is not defined");
					if (!task.task.labels) return task;

					task.task.labels = await this.plugin.labelsApi.getAndCreateLabels(task.task.labels);
					if (this.plugin.settings.debugging) console.log("Processor: Preparing labels for local tasks for vikunja update", task);
					return task;
				}
			));
	}

	private getVaultSearcher() {
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

	private getTaskParser() {
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

	private async pushTasksFromVaultToVikunja(localTasks: PluginTask[], vikunjaTasks: ModelsTask[]) {
		const tasksToPushToVikunja = localTasks.filter(task => !vikunjaTasks.find(vikunjaTask => vikunjaTask.id === task.task.id));
		if (this.plugin.settings.debugging) console.log("Processor: Pushing tasks to vikunja", tasksToPushToVikunja);
		const createdTasksInVikunja = await this.plugin.tasksApi.createTasks(tasksToPushToVikunja.map(task => task.task));
		if (this.plugin.settings.debugging) console.log("Processor: Created tasks in vikunja", createdTasksInVikunja);

		const tasksToUpdateInVault = localTasks.map(task => {
			const createdTask = createdTasksInVikunja.find(vikunjaTask => vikunjaTask.title === task.task.title);
			if (createdTask) {
				task.task = createdTask;
			}
			return task;
		});
		for (const task of tasksToUpdateInVault) {
			await this.updateToVault(task);
		}
	}

	private async pullTasksFromVikunjaToVault(localTasks: PluginTask[], vikunjaTasks: ModelsTask[]) {
		if (this.plugin.settings.debugging) console.log("Processor: Pulling tasks from vikunja to vault, vault tasks", localTasks, "vikunja tasks", vikunjaTasks);

		const tasksToPushToVault = vikunjaTasks.filter(task => !localTasks.find(vaultTask => vaultTask.task.id === task.id));
		if (this.plugin.settings.debugging) console.log("Processor: Pushing tasks to vault", tasksToPushToVault);

		const createdTasksInVault: PluginTask[] = [];
		for (const task of tasksToPushToVault) {
			let file: TFile;
			const chosenFile = this.app.vault.getFileByPath(this.plugin.settings.chosenOutputFile);
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

	private async updateTasksInVikunja(updateTasks: PluginTask[]) {
		if (this.plugin.settings.debugging) console.log("Processor: Update tasks in vikunja");

		for (const task of updateTasks) {
			await this.plugin.tasksApi.updateTask(task.task);
		}
	}

	private async updateTasksInVault(updateTasks: PluginTask[]) {
		if (this.plugin.settings.debugging) console.log("Processor: Update tasks in vault");

		for (const task of updateTasks) {
			await this.updateToVault(task);
		}
	}

	/*
	 * Remove tasks in Vikunja if they are not in the vault anymore.
	 * Returns the tasks which are not in the vault anymore. Filter it yourself if needed.
	 */
	private async removeTasksInVikunjaIfNotInVault(localTasks: PluginTask[], vikunjaTasks: ModelsTask[]): Promise<ModelsTask[]> {
		// Check placed here, so no wrong deletion happens
		if (!this.plugin.settings.removeTasksIfInVaultNotFound) {
			if (this.plugin.settings.debugging) console.log("Processor: Not deleting tasks in vikunja if ID not found in vault");
			return [];
		}

		let tasksToDeleteInVikunja = vikunjaTasks.filter(task => !localTasks.find(vaultTask => vaultTask.task.id === task.id));
		if (this.plugin.settings.debugging) console.log("Processor: Deleting tasks in vikunja", tasksToDeleteInVikunja);

		if (this.plugin.settings.removeTasksOnlyInDefaultProject) {
			tasksToDeleteInVikunja = tasksToDeleteInVikunja.filter(task => task.projectId === this.plugin.settings.defaultVikunjaProject);
		}
		await this.plugin.tasksApi.deleteTasks(tasksToDeleteInVikunja);

		return tasksToDeleteInVikunja;
	}

	private async removeLabelsInVikunjaIfNotInVault(localTasks: PluginTask[], _vikunjaTasks: ModelsTask[]) {
		if (!this.plugin.settings.removeLabelsIfInVaultNotUsed) {
			if (this.plugin.settings.debugging) console.log("Processor: Not deleting labels in vikunja if ID not found in vault");
			return;
		}

		for (const task of localTasks) {
			if (!task.task.labels) continue;

			const labels = task.task.labels;
			if (this.plugin.settings.debugging) console.log("Processor: Found labels which are used in Vault", labels);
			await this.plugin.labelsApi.deleteUnusedLabels(labels);
		}
	}

	/*
	 * Split tasks into two groups:
	 * - tasksToUpdateInVault: Tasks which have updates in Vikunja
	 * - tasksToUpdateInVikunja: Tasks which have updates in the vault
	 *
	 * tasksToUpdateInVault has already all informations needed for vault update.
	 */
	private splitTaskAfterUpdatedStatus(localTasks: PluginTask[], vikunjaTasks: ModelsTask[]): UpdatedSplit {
		if (this.plugin.settings.debugging) console.log("Processor: Find tasks which have updates on the other platform");

		let tasksToUpdateInVault: PluginTask[] = [];
		let tasksToUpdateInVikunja: PluginTask[] = [];
		for (const task of localTasks) {
			const vikunjaTask = vikunjaTasks.find(vikunjaTask => vikunjaTask.id === task.task.id);
			if (!vikunjaTask) continue;
			if (!vikunjaTask || !vikunjaTask.updated || !task.task.updated) {
				if (this.plugin.settings.debugging) console.log("Task updated field is not defined", task, vikunjaTask);
				throw new Error("Task updated field is not defined");
			}

			let comparison;
			if (vikunjaTask.updated > task.task.updated) {
				task.task = vikunjaTask;
				tasksToUpdateInVault.push(task);
				comparison = "Vikunja";
			} else {
				tasksToUpdateInVikunja.push(task);
				comparison = "Vault";
			}
			if (this.plugin.settings.debugging) console.log(`Processor: Task updated will be updated in ${comparison}, updated on vikunja`, vikunjaTask.updated, " updated on vault", task.task.updated);
		}

		return {
			tasksToUpdateInVault: tasksToUpdateInVault,
			tasksToUpdateInVikunja: tasksToUpdateInVikunja
		};
	}
}

export {Processor};
