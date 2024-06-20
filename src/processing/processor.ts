import VikunjaPlugin from "../../main";
import {App, moment, Notice, TFile} from "obsidian";
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

class Processor {
	app: App;
	plugin: VikunjaPlugin;
	vaultSearcher: VaultSearcher;
	taskParser: TaskParser;
	taskFormatter: TaskFormatter;

	constructor(app: App, plugin: VikunjaPlugin) {
		this.app = app;
		this.plugin = plugin;

		this.vaultSearcher = this.getVaultSearcher();
		this.taskParser = this.getTaskParser();
		this.taskFormatter = this.getTaskFormatter();
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
			// FIXME Currently cannot be used, because there is a bug in vikunja, which returns 401 in api to get the user object.
			//this.plugin.userObject = await new User(this.app, this.plugin).getUser();
		}

		// Get all tasks in vikunja and vault
		if (this.plugin.settings.debugging) console.log("Processor: Pulling tasks from vault");
		const localTasks = this.vaultSearcher.getTasks(this.taskParser);
		if (this.plugin.settings.debugging) console.log("Processor: Got tasks from vault", localTasks);

		if (this.plugin.settings.debugging) console.log("Processor: Pulling tasks from vikunja");
		const vikunjaTasks = await this.plugin.vikunjaTasksApi.getAllTasks();
		if (this.plugin.settings.debugging) console.log("Processor: Got tasks from vikujnja", vikunjaTasks);

		// Processing steps
		if (this.plugin.settings.debugging) console.log("Processor: Creating tasks in vikunja and vault");
		await this.pullTasksFromVikunjaToVault(localTasks, vikunjaTasks);
		await this.pushTasksFromVaultToVikunja(localTasks, vikunjaTasks);

		if (this.plugin.settings.debugging) console.log("Processor: Updating tasks in vikunja and vault");
		await this.updateTasksInVault(localTasks, vikunjaTasks);
		await this.updateTasksInVikunja(localTasks, vikunjaTasks);

		// TODO Think about, how to delete tasks in vikunja and vault and how to check for this.
		this.removeTasksInVikunjaIfNotInVault(localTasks, vikunjaTasks);

		if (this.plugin.settings.debugging) console.log("Processor: End processing");
	}

	getTaskContent(task: PluginTask) {
		let taskStatus = "- [ ] ";
		if (task.task.done) {
			taskStatus = "- [x] ";
		}

		const content: string = this.taskFormatter.format(task.task);
		return `${taskStatus}${content} [vikunja_id:: ${task.task.id}]`;
	}

	async updateToVault(task: PluginTask) {
		const newTask = this.getTaskContent(task);

		await this.app.vault.process(task.file, data => {
			const lines = data.split("\n");
			lines.splice(task.lineno, 1, newTask);
			return lines.join("\n");
		});
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

	getTaskFormatter(): EmojiTaskFormatter {
		switch (this.plugin.settings.useTasksFormat) {
			case supportedTasksPluginsFormat.Emoji:
				return new EmojiTaskFormatter(this.app, this.plugin);
			default:
				throw new Error("No valid TaskFormat selected");
		}
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
		const createdTasksInVikunja = await this.plugin.vikunjaTasksApi.createTasks(tasksToPushToVikunja.map(task => task.task));
		if (this.plugin.settings.debugging) console.log("Processor: Created tasks in vikunja", createdTasksInVikunja);

		const tasksToUpdateInVault = localTasks.map(task => {
			const createdTask = createdTasksInVikunja.find(vikunjaTask => task.task.id === undefined && vikunjaTask.title === task.task.title);
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
		if (this.plugin.settings.debugging) console.log("Processor: Pulling tasks from vikunja to vault");

		const tasksToPushToVault = vikunjaTasks.filter(task => !localTasks.find(vaultTask => vaultTask.task.id === task.id));
		if (this.plugin.settings.debugging) console.log("Processor: Pushing tasks to vault", tasksToPushToVault);

		const createdTasksInVault = tasksToPushToVault.map(async task => {
			let file: TFile;
			const chosenFile = this.app.vault.getAbstractFileByPath(this.plugin.settings.chosenOutputFile);
			const date = moment();
			const dailies = getAllDailyNotes()

			switch (this.plugin.settings.chooseOutputFile) {
				case chooseOutputFile.File:
					if (!chosenFile) throw new Error("Output file not found");
					file = chosenFile as TFile;
					break;
				case chooseOutputFile.DailyNote:
					if (!appHasDailyNotesPluginLoaded()) {
						console.log("Daily notes core plugin is not loaded. So we cannot create daily note. Please install daily notes core plugin. Interrupt now.")
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
			return pluginTask;
		});

		for (const task of createdTasksInVault) {
			await this.saveToVault(await task);
		}
	}

	private async updateTasksInVikunja(localTasks: PluginTask[], vikunjaTasks: ModelsTask[]) {
		if (this.plugin.settings.debugging) console.log("Processor: Update tasks in vikunja");

		const tasksToUpdateInVikunja = localTasks.filter(task => vikunjaTasks.find(vikunjaTask => vikunjaTask.id === task.task.id && vikunjaTask.title !== task.task.title));
		if (this.plugin.settings.debugging) console.log("Processor: Updating tasks in vikunja", tasksToUpdateInVikunja);
		const updatedTasksInVikunja = await this.plugin.vikunjaTasksApi.updateTasks(tasksToUpdateInVikunja.map(task => task.task));


		const tasksToUpdateInVault = localTasks.map(task => {
			const updatedTask = updatedTasksInVikunja.find(vikunjaTask => task.task.id === vikunjaTask.id);
			if (updatedTask) {
				task.task = updatedTask;
			}
			return task;
		});
		for (const task of tasksToUpdateInVault) {
			await this.updateToVault(task);
		}
	}

	private async updateTasksInVault(localTasks: PluginTask[], vikunjaTasks: ModelsTask[]) {
		// TODO Update tasks in the vault, but beware: It needs a mechanism to check, if the task on vikunja was updated earlier then the task in the vault
		// Maybe the ctime from obsidian and updated from vikunja can be used for this.
		if (this.plugin.settings.debugging) console.log("Processor: Update tasks in vault");
		console.log("Processor: Method not implemented yet to update tasks vault")
	}

	private async removeTasksInVikunjaIfNotInVault(localTasks: PluginTask[], vikunjaTasks: ModelsTask[]) {
		if (!this.plugin.settings.removeTasksIfInVaultNotFound) {
			if (this.plugin.settings.debugging) console.log("Processor: Not deleting tasks in vikunja if ID not found in vault");
			return;
		}

		let tasksToDeleteInVikunja = vikunjaTasks.filter(task => !localTasks.find(vaultTask => vaultTask.task.id === task.id));
		if (this.plugin.settings.debugging) console.log("Processor: Deleting tasks in vikunja", tasksToDeleteInVikunja);

		if (this.plugin.settings.removeTasksOnlyInDefaultProject) {
			tasksToDeleteInVikunja = tasksToDeleteInVikunja.filter(task => task.projectId === this.plugin.settings.defaultVikunjaProject);
		}
		await this.plugin.vikunjaTasksApi.deleteTasks(tasksToDeleteInVikunja);

	}
}

export {Processor};
