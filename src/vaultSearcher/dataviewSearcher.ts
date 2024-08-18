import {App, moment, Notice, TFile} from "obsidian";
import VikunjaPlugin from "../../main";
import {DataArray, DataviewApi, getAPI} from "obsidian-dataview";
import {PluginTask, VaultSearcher} from "./vaultSearcher";
import {TaskParser} from "src/taskFormats/taskFormats";

const MAX_TIMEOUT_FOR_DATACACHE = 30;

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
		await this.handleDataviewIndex();

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
		let currentFile = undefined;
		// this fixes an issue where the last open file is not set and dataview cannot be triggered to reindex. This is only a workaround to make the plugin more stable.
		const fns = [() => this.app.workspace.getActiveFile(), () => this.app.vault.getFileByPath(this.app.workspace.getLastOpenFiles()[0]), () => this.app.vault.getMarkdownFiles()[0]];
		while (currentFile === undefined && fns.length > 0) {
			const fn = fns.shift();
			if (fn) {
				currentFile = fn();
			}
			if (this.plugin.settings.debugging) console.log("Step GetTask: using file for indexing", currentFile, "fn", fn);
		}

		if (!currentFile) {
			new Notice("Vikunja Plugin: Could not find any files in the vault! Please create a file first.");
			throw new Error("Vikunja Plugin: Could not find any files in the vault! Please create a file first.");
		}

		// This is to count the event, so we can be sure to get the latest state from dataview
		let counter = 2;
		// @ts-ignore
		this.plugin.registerEvent(this.plugin.app.metadataCache.on("dataview:metadata-change", (type, file, oldPath?) => {
			if (this.plugin.settings.debugging) console.log("Step GetTask: Dataview metadata change", type, file, oldPath);
			counter--;
		}, this));

		// Trigger reindexing of DataView for the current file https://github.com/blacksmithgu/obsidian-dataview/blob/3c29f7cb5bb76f62b5342b88050e054a7272667f/src/data-index/index.ts#L97
		this.app.metadataCache.trigger("resolve", currentFile);
		// This is a fix, because if we came here via sync, obsidian does not trigger a resolve event, so we do it on our own a second time. ugly as hell!
		this.app.metadataCache.trigger("resolve", currentFile);

		// Because it is possible, that obsidian does not trigger the event a second time, we need a backup, so we go further after some time.
		let timeout = 0;
		while (counter > 0 && timeout < MAX_TIMEOUT_FOR_DATACACHE) {
			if (this.plugin.settings.debugging) console.log("Step GetTask: Waiting for dataview index to be ready", "counter for events", counter, "timeout counter as backup", timeout);
			await new Promise(resolve => setTimeout(resolve, 500));
			timeout++;
		}

		if (this.plugin.settings.debugging) console.log("Step GetTask: Dataview index is ready");
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
