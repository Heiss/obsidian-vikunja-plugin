import {App, moment, Notice, TFile} from "obsidian";
import VikunjaPlugin from "../../main";
import {DataArray, DataviewApi, getAPI} from "obsidian-dataview";
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

	async getTasksFromFile(parser: TaskParser, file: TFile): Promise<PluginTask[]> {
		const dv = this.dataviewPlugin;
		let tasks = undefined;

		const page = dv.page(file.path);
		if (page === undefined) {
			console.error("DataviewSearcher: Could not find page for file", file);
			return [];
		}
		if (page.file.tasks === undefined) {
			console.error("DataviewSearcher: Could not find tasks for page", page);
			return [];
		}
		tasks = page.file.tasks;
		return await this.parseTasks(tasks, parser);
	}

	async getTasks(parser: TaskParser): Promise<PluginTask[]> {
		await this.handleDataviewIndex();

		const dv = this.dataviewPlugin;
		const tasks = dv.pages().file.tasks;

		return await this.parseTasks(tasks, parser);
	}

	/*
	* This function is used to wait for the dataview index to be ready.
	* Because dataview only indexing, if something changed, but sync does not know if anything changed recently,
	* we need to trigger it manually.
	 */
	private async handleDataviewIndex() {
		let currentFile;
		// this fixes an issue where the last open file is not set and dataview cannot be triggered to reindex. This is only a workaround to make the plugin more stable.
		const fns = [() => this.app.workspace.getActiveFile(), () => this.app.vault.getFileByPath(this.app.workspace.getLastOpenFiles()[0]), () => this.app.vault.getMarkdownFiles()[0]];
		while (!currentFile && fns.length > 0) {
			const fn = fns.pop();
			if (fn) {
				currentFile = fn();

			}
			console.log("currentFile", currentFile);
		}

		if (!currentFile) {
			new Notice("Vikunja Plugin: Could not find any files in the vault! Please create a file first.");
			throw new Error("Vikunja Plugin: Could not find any files in the vault! Please create a file first.");
		}

		let dataViewIndexReady = false;
		// @ts-ignore
		this.plugin.registerEvent(this.plugin.app.metadataCache.on("dataview:metadata-change", () => {
			dataViewIndexReady = true;
		}));

		// Trigger reindexing of DataView for the current file
		this.app.metadataCache.trigger("resolve", currentFile);

		while (!dataViewIndexReady) {
			if (this.plugin.settings.debugging) console.log("Step GetTask: Waiting for dataview index to be ready");
			await new Promise(resolve => setTimeout(resolve, 500));
		}
	}

	private async parseTasks(tasks: DataArray, parser: TaskParser) {
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
			let cachedTask = undefined;
			const id = parsed.id;
			if (id !== undefined) {
				cachedTask = this.plugin.cache.get(id);
			}
			if (cachedTask !== undefined) {
				if (this.plugin.settings.debugging) console.log("DataviewSearcher: Found cached task", cachedTask);
				parsed.updated = cachedTask.task.updated;
			} else {
				if (this.plugin.settings.debugging) console.log("DataviewSearcher: Fallback to file modified date");
				parsed.updated = moment(file.stat.mtime).format("YYYY-MM-DDTHH:mm:ss[Z]");
			}

			const vaultParsed = new PluginTask(file.path, task.line, parsed);
			if (this.plugin.settings.debugging) console.log("DataviewSearcher: Parsed task", parsed);
			tasksFormatted.push(vaultParsed);
		}

		if (this.plugin.settings.debugging) console.log("DataviewSearcher: Finally formatted tasks", tasksFormatted);

		return tasksFormatted;
	}
}
