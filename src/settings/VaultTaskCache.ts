import VikunjaPlugin from "../../main";
import {App, moment} from "obsidian";
import {PluginTask} from "../vaultSearcher/vaultSearcher";


interface Cache<T> {
	[key: number]: T;
}

/*
* This class is used to cache tasks which are updated in Vault, but not in Vikunja.
* This should help to identify modifications in vault without Obsidian.
* Also it makes it possible to update only modified tasks. See issue #9 for more details.
*/
export default class VaultTaskCache {
	plugin: VikunjaPlugin;
	app: App;
	changesMade: boolean;
	private cache: Map<number, PluginTask>

	constructor(app: App, plugin: VikunjaPlugin) {
		this.app = app;
		this.plugin = plugin;
		this.changesMade = false;
		this.cache = new Map<number, PluginTask>();
	}

	public static fromJson(json: any, app: App, plugin: VikunjaPlugin): VaultTaskCache {
		const cache = new VaultTaskCache(app, plugin);
		console.log("VaultTaskCache: Loading cache from disk", json);
		const tempCache = Object.entries(json).map((taskJson: any) => {
			const id = parseInt(taskJson[0]);
			const task = PluginTask.fromJson(taskJson[1]);
			if (task === undefined) {
				return undefined
			}
			return [id, task];
		}).filter((task: any) => task !== undefined);
		// @ts-ignore
		cache.cache = new Map<number, PluginTask>(tempCache);
		console.log("VaultTaskCache: Loaded cache from disk", cache.cache);
		return cache;
	}

	async saveCacheToDisk() {
		if (this.changesMade) {
			if (this.plugin.settings.debugging) console.log("VaultTaskCache: Saving cache to disk");
			await this.plugin.saveSettings();
		}
		this.changesMade = false;
	}

	updateFileInfos(id: number, filepath: string, lineno: number) {
		const cachedTask = this.get(id);
		if (cachedTask === undefined) {
			throw new Error("VaultTaskCache: Task is not in cache");
		}
		if (this.plugin.settings.debugging) console.log("VaultTaskCache: Updating task", id, "with updated file infos", filepath, lineno);
		cachedTask.filepath = filepath;
		cachedTask.lineno = lineno;
		this.cache.set(id, cachedTask);
		this.changesMade = true;
	}

	update(local: PluginTask) {
		if (local.task.id === undefined) {
			throw new Error("VaultTaskCache: Task id is not defined");
		}

		const cachedTask = this.get(local.task.id);
		const currentDate = moment().format("YYYY-MM-DDTHH:mm:ss[Z]");
		if (cachedTask !== undefined && !cachedTask.isTaskEqual(local.task)) {
			if (this.plugin.settings.debugging) console.log("VaultTaskCache: Updating task", local.task.id, "with updated date", currentDate);
			local.task.updated = currentDate;
		}
		this.cache.set(local.task.id, local);

		console.log("VaultTaskCache: Updated cache", this.cache);
		this.plugin.settings.cache = this.getCachedTasks().map(task => task.toJson());
		console.log("VaultTaskCache: Updated cache in settings", this.plugin.settings.cache);
		this.changesMade = true;
	}

	get(id: number): PluginTask | undefined {
		return this.cache.get(id);
	}

	/*
	* Useful, when tasks are updated in vikunja and so the task in the cache is outdated.
	*/
	delete(id: number) {
		this.cache.delete(id);
		this.changesMade = true;
	}

	/*
	* Do not forget to call delete after processing the tasks.
	*/
	getCachedTasks(): PluginTask[] {
		return Array.from(this.cache.values());
	}

	reset() {
		this.cache.clear();
		this.changesMade = true;
	}
}
