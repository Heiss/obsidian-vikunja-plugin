import {App} from "obsidian";
import VikunjaPlugin from "../../main";
import {DataviewApi, getAPI} from "obsidian-dataview";
import {VaultSearcher} from "./vaultSearcher";
import {TaskParser} from "src/taskFormats/taskFormats";
import {ModelsTask} from "vikunja_sdk";

export class DataviewSearcher implements VaultSearcher {
	app: App;
	plugin: VikunjaPlugin;
	dataviewPlugin: DataviewApi;

	constructor(app: App, plugin: VikunjaPlugin) {
		this.app = app;
		this.plugin = plugin;
		this.dataviewPlugin = getAPI(this.app);
	}

	getTasks(parser: TaskParser): ModelsTask[] {
		const dv = this.dataviewPlugin;
		const tasks = dv.pages().file.tasks.values;

		if (this.plugin.settings.debugging) console.log("Found dataview tasks ", tasks);

		let tasksFormatted: ModelsTask[] = [];
		for (const task of tasks) {
			tasksFormatted.push(parser.parse(task));
		}

		if (this.plugin.settings.debugging) console.log("Formatted tasks ", tasksFormatted);

		return tasksFormatted;
	}
}
