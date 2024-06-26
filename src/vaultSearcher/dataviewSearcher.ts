import {App, moment, TFile} from "obsidian";
import VikunjaPlugin from "../../main";
import {DataviewApi, getAPI} from "obsidian-dataview";
import {PluginTask, VaultSearcher} from "./vaultSearcher";
import {TaskParser} from "src/taskFormats/taskFormats";

export class DataviewSearcher implements VaultSearcher {
	app: App;
	plugin: VikunjaPlugin;
	dataviewPlugin: DataviewApi;

	constructor(app: App, plugin: VikunjaPlugin) {
		this.app = app;
		this.plugin = plugin;
		this.dataviewPlugin = getAPI(this.app);
	}

	async getTasks(parser: TaskParser): Promise<PluginTask[]> {
		const dv = this.dataviewPlugin;
		const tasks = dv.pages().file.tasks.values;

		if (this.plugin.settings.debugging) console.log("DataviewSearcher: Found dataview tasks", tasks);

		const tasksFormatted: PluginTask[] = [];
		for (const task of tasks) {
			let taskBracket = "- [ ]";
			if (task.completed) {
				taskBracket = "- [x]";
			}

			const parsed = await parser.parse(`${taskBracket} ${task.text}`)
			const file = this.app.vault.getFileByPath(task.path);
			if (!file) {
				console.error("DataviewSearcher: Could not find file for task", task);
				continue;
			}
			parsed.updated = moment(file.stat.mtime).format("YYYY-MM-DDTHH:mm:ss[Z]");

			const vaultParsed: PluginTask = {
				file: file,
				lineno: task.line,
				task: parsed
			};
			if (this.plugin.settings.debugging) console.log("DataviewSearcher: Parsed task", parsed);
			tasksFormatted.push(vaultParsed);
		}

		if (this.plugin.settings.debugging) console.log("DataviewSearcher: Finally formatted tasks", tasksFormatted);

		return tasksFormatted;
	}
}
