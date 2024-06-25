import {IAutomatonSteps, StepsOutput} from "./automaton";
import {PluginTask} from "../vaultSearcher/vaultSearcher";
import {ModelsTask} from "../../vikunja_sdk";
import {App, moment, Notice, TFile} from "obsidian";
import {
	appHasDailyNotesPluginLoaded,
	createDailyNote,
	getAllDailyNotes,
	getDailyNote
} from "obsidian-daily-notes-interface";
import {chooseOutputFile} from "../enums";
import VikunjaPlugin from "../../main";
import {Processor} from "./processor";

class CreateTasks implements IAutomatonSteps {
	app: App;
	plugin: VikunjaPlugin;
	processor: Processor;

	constructor(app: App, plugin: VikunjaPlugin, processor: Processor) {
		this.app = app;
		this.plugin = plugin;
		this.processor = processor;
	}

	async step(localTasks: PluginTask[], vikunjaTasks: ModelsTask[]): Promise<StepsOutput> {
		await this.createTasks(localTasks, vikunjaTasks);

		return {localTasks, vikunjaTasks};
	}

	private async createTasks(localTasks: PluginTask[], vikunjaTasks: ModelsTask[]) {
		if (this.plugin.settings.debugging) console.log("Step CreateTask: Creating labels in Vikunja", localTasks);
		localTasks = await this.createLabels(localTasks);

		if (this.plugin.settings.debugging) console.log("Step CreateTask: Creating tasks in Vikunja and vault", localTasks, vikunjaTasks);
		await this.pullTasksFromVikunjaToVault(localTasks, vikunjaTasks);
		await this.pushTasksFromVaultToVikunja(localTasks, vikunjaTasks);
	}

	private async createLabels(localTasks: PluginTask[]) {
		return await Promise.all(localTasks
			.map(async task => {
					if (!task.task) throw new Error("Task is not defined");
					if (!task.task.labels) return task;

					task.task.labels = await this.plugin.labelsApi.getAndCreateLabels(task.task.labels);
					if (this.plugin.settings.debugging) console.log("Step CreateTask: Preparing labels for local tasks for vikunja update", task);
					return task;
				}
			));
	}

	private async pushTasksFromVaultToVikunja(localTasks: PluginTask[], vikunjaTasks: ModelsTask[]) {
		const tasksToPushToVikunja = localTasks.filter(task => !vikunjaTasks.find(vikunjaTask => vikunjaTask.id === task.task.id));
		if (this.plugin.settings.debugging) console.log("Step CreateTask: Pushing tasks to vikunja", tasksToPushToVikunja);
		const createdTasksInVikunja = await this.plugin.tasksApi.createTasks(tasksToPushToVikunja.map(task => task.task));
		if (this.plugin.settings.debugging) console.log("Step CreateTask: Created tasks in vikunja", createdTasksInVikunja);

		const tasksToUpdateInVault = localTasks.map(task => {
			const createdTask = createdTasksInVikunja.find((vikunjaTask: ModelsTask) => vikunjaTask.title === task.task.title);
			if (createdTask) {
				task.task = createdTask;
			}
			return task;
		});
		for (const task of tasksToUpdateInVault) {
			await this.processor.updateToVault(task);
		}
	}

	private async pullTasksFromVikunjaToVault(localTasks: PluginTask[], vikunjaTasks: ModelsTask[]) {
		if (this.plugin.settings.debugging) console.log("Step CreateTask: Pulling tasks from vikunja to vault, vault tasks", localTasks, "vikunja tasks", vikunjaTasks);

		const tasksToPushToVault = vikunjaTasks.filter(task => !localTasks.find(vaultTask => vaultTask.task.id === task.id));
		if (this.plugin.settings.debugging) console.log("Step CreateTask: Pushing tasks to vault", tasksToPushToVault);

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
			await this.processor.saveToVault(task);
		}
	}
}

export default CreateTasks;
