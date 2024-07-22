import {backendToFindTasks, chooseOutputFile} from "../enums";
import {appHasDailyNotesPluginLoaded} from "obsidian-daily-notes-interface";
import {App, Notice} from "obsidian";
import {getAPI} from "obsidian-dataview";
import VikunjaPlugin from "../../main";
import {PluginTask} from "../vaultSearcher/vaultSearcher";
import {ConfirmModal} from "../modals/confirmModal";
import VikunjaAPI from "../vikunja/VikunjaAPI";

export default class Commands {
	private plugin: VikunjaPlugin;
	private readonly app: App;
	private foundProblem = false;

	constructor(app: App, plugin: VikunjaPlugin) {
		this.plugin = plugin;
		this.app = app;
	}

	isEverythingSetup() {
		return this.foundProblem;
	}

	checkDependencies() {
		let foundProblem = false;

		if (this.plugin.settings.chooseOutputFile === chooseOutputFile.DailyNote && !appHasDailyNotesPluginLoaded()) {
			new Notice("Vikunja Plugin: Daily notes core plugin is not loaded. So we cannot create daily note. Please install daily notes core plugin to use Daily Note.")
			if (this.plugin.settings.debugging) console.log("Vikunja Plugin: Daily notes core plugin is not loaded. So we cannot create daily note. Please install daily notes core plugin to use Daily Note.");
			foundProblem = true;
		}

		if (this.plugin.settings.chooseOutputFile === chooseOutputFile.File) {
			if (this.plugin.settings.chosenOutputFile === "") {
				new Notice("Vikunja Plugin: Output file is not selected. Please select a file to use File as output.");
				if (this.plugin.settings.debugging) console.log("Vikunja Plugin: Output file is not selected. Please select a file to use File as output.");
				foundProblem = true;
			}
			if (this.app.vault.getAbstractFileByPath(this.plugin.settings.chosenOutputFile) === null) {
				new Notice("Vikunja Plugin: Output file not found. Please select a valid file to use File as output.");
				if (this.plugin.settings.debugging) console.log("Vikunja Plugin: Output file not found. Please select a valid file to use File as output.");
				foundProblem = true;
			}
		}

		if (this.plugin.settings.backendToFindTasks === backendToFindTasks.Dataview && getAPI(this.app) === undefined) {
			new Notice("Vikunja Plugin: Obsidian Dataview plugin is not loaded. Please install Obsidian Dataview plugin to use Dataview.");
			if (this.plugin.settings.debugging) console.log("Vikunja Plugin: Obsidian Dataview plugin is not loaded. Please install Obsidian Dataview plugin to use Dataview.");
			foundProblem = true;
		}

		const checkAPIs: VikunjaAPI[] = [this.plugin.labelsApi, this.plugin.tasksApi, this.plugin.projectsApi];
		if (!checkAPIs.every(api => api.checkPermissions())) {
			new Notice("Vikunja Plugin: Not sufficient permissions for Vikunja API. Please check the permissions in Vikunja Settings and create a new token.");
			if (this.plugin.settings.debugging) console.log("Vikunja Plugin: Not sufficient permissions for Vikunja API. Please check the permissions in Vikunja Settings.");
			foundProblem = true;
		}

		if (this.plugin.settings.availableViews.length === 0) {
			new Notice("Vikunja Plugin: No views found. Please configure the plugin before using it.");
			if (this.plugin.settings.debugging) console.log("Vikunja Plugin: No views found. Please configure the plugin before using it.");
			foundProblem = true;
		}

		if (foundProblem) {
			new Notice(
				"Vikunja Plugin: Found problems. Please fix them in settings before using the plugin."
			);
		}

		this.foundProblem = foundProblem;
	}

	// Move all tasks from Vault to default project in Vikunja
	async moveAllTasksToDefaultProject() {
		if (this.isEverythingSetup()) {
			new Notice("Vikunja Plugin: Found problems in plugin. Have to be fixed first. Syncing is stopped.");
			return;
		}
		if (this.plugin.settings.debugging) console.log("Move all tasks to default project");

		const tasks = (await this.getTasksFromVault()).filter(task => task.task.id !== undefined).map(task => task.task);
		await this.plugin.tasksApi.updateProjectsIdInVikunja(tasks, this.plugin.settings.defaultVikunjaProject);
	}

	async pullTasksFromVikunja() {
		if (this.isEverythingSetup()) {
			new Notice("Vikunja Plugin: Found problems in plugin. Have to be fixed first. Syncing is stopped.");
			return;
		}
		if (this.plugin.settings.debugging) console.log("Pull tasks from Vikunja");

		const vikunjaTasks = await this.plugin.tasksApi.getAllTasks();
		const vaultTasks = await this.getTasksFromVault();
		await this.plugin.processor.pullTasksFromVikunjaToVault(vaultTasks, vikunjaTasks);
	}

	async getTasksFromVault(): Promise<PluginTask[]> {
		const vaultSearcher = this.plugin.processor.getVaultSearcher();
		const taskParser = this.plugin.processor.getTaskParser();

		return await vaultSearcher.getTasks(taskParser);
	}

	async resetTasksInVikunja() {
		if (this.plugin.settings.debugging) console.log("Reset tasks in Vikunja");

		new ConfirmModal(this.app, async (result) => {
				if (result !== "yes") {
					if (this.plugin.settings.debugging) console.log("Reset tasks in Vikunja cancelled");
					return;
				}

				if (this.plugin.settings.debugging) console.log("Resetting tasks in Vikunja confirmed");

				new Notice("Remove Vikunja Metadata in Vault");
				const vaultTasks = await this.getTasksFromVault();

				for (const task of vaultTasks) {
					await this.plugin.processor.updateToVault(task, false)
				}

				new Notice("Deleting tasks and labels in Vikunja");

				while (true) {
					const tasks = await this.plugin.tasksApi.getAllTasks();
					const labels = await this.plugin.labelsApi.labelsApi.labelsGet();

					if (tasks.length === 0 && labels.length === 0) {
						if (this.plugin.settings.debugging) console.log("No tasks and labels found in Vikunja");
						break;
					}

					// It is important to handle both tasks and labels in one go, because tasks throws an error, if deleted in one go, so there need some time between execution.
					if (this.plugin.settings.debugging) console.log("Deleting tasks", tasks);
					await this.plugin.tasksApi.deleteTasks(tasks);

					if (this.plugin.settings.debugging) console.log("Deleting labels", labels);
					await this.plugin.labelsApi.deleteLabels(labels);
				}

				if (this.plugin.settings.debugging) console.log("Resetting tasks in Vikunja done");
				await this.plugin.labelsApi.loadLabels();
				new Notice("Resetting tasks and labels in Vikunja done");
			}
		).open();
	}
}
