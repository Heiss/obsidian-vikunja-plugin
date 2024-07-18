import {backendToFindTasks, chooseOutputFile} from "../enums";
import {appHasDailyNotesPluginLoaded} from "obsidian-daily-notes-interface";
import {App, Notice} from "obsidian";
import {getAPI} from "obsidian-dataview";
import VikunjaPlugin from "../../main";

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
		if (this.plugin.settings.chooseOutputFile === chooseOutputFile.DailyNote && appHasDailyNotesPluginLoaded()) {
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

		const vaultSearcher = this.plugin.processor.getVaultSearcher();
		const taskParser = this.plugin.processor.getTaskParser();

		const tasks = (await vaultSearcher.getTasks(taskParser)).filter(task => task.task.id !== undefined).map(task => task.task);
		await this.plugin.tasksApi.updateProjectsIdInVikunja(tasks, this.plugin.settings.defaultVikunjaProject);
	}
}
