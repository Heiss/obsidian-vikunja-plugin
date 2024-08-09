import VikunjaPlugin from "../../main";
import {App, moment} from "obsidian";
import {PluginTask} from "../vaultSearcher/vaultSearcher";

/*
* This class is used to cache tasks which are updated in Vault, but not in Vikunja.
* This should help to identify modifications in vault without Obsidian.
* Also it makes it possible to update only modified tasks. See issue #9 for more details.
*/
export default class VaultTaskCache {
	private static readonly SAVE_TO_DISK_DELAYED_INTERVAL = 250;
	plugin: VikunjaPlugin;
	app: App;
	changesMade: boolean;
	private cache: Map<number, PluginTask>
	private saveToDiskDelayedListener: number | undefined;

	constructor(app: App, plugin: VikunjaPlugin) {
		this.app = app;
		this.plugin = plugin;
		this.changesMade = false;
		this.cache = new Map<number, PluginTask>();
		this.saveToDiskDelayedListener = undefined;
	}

	public static fromJson(json: any, app: App, plugin: VikunjaPlugin): VaultTaskCache {
		const taskCache = new VaultTaskCache(app, plugin);
		console.log("VaultTaskCache: Loading cache from disk", json);
		const tempCache = Object.entries(json).map((taskJson: any) => {
			const task = PluginTask.fromJson(taskJson[1]);
			if (task === undefined) {
				return undefined
			}
			const id = task.task.id;
			if (id === undefined) {
				throw new Error("VaultTaskCache: Task id is not defined");
			}
			return [id, task];
		}).filter((task: any) => task !== undefined);
		// @ts-ignore
		taskCache.cache = new Map<number, PluginTask>(tempCache);
		console.log("VaultTaskCache: Loaded cache from disk", taskCache.cache);
		return taskCache;
	}

	/*
	* This function is used to save the cache to disk, but it waits an interval until it is saved.
	* It resets the interval everytime, anything calls this method.
	 */
	async saveCacheToDiskDelayed() {
		window.clearInterval(this.saveToDiskDelayedListener);
		this.saveToDiskDelayedListener = window.setInterval(async () => {
			await this.saveCacheToDisk();
		}, VaultTaskCache.SAVE_TO_DISK_DELAYED_INTERVAL);
		this.plugin.registerInterval(this.saveToDiskDelayedListener);
	}

	async saveCacheToDisk() {
		if (this.changesMade) {
			this.plugin.settings.cache = this.getCachedTasks().map(task => task.toJson());
			if (this.plugin.settings.debugging) console.log("VaultTaskCache: Updated cache in settings", this.plugin.settings.cache);
			await this.plugin.saveSettings();
		}
		this.changesMade = false;
	}

	async reindex() {
		const cache = new Map<number, PluginTask>();
		const tasks = await this.plugin.processor.getVaultSearcher().getTasks(this.plugin.processor.getTaskParser());
		tasks.map(task => {
			if (task.task.id === undefined) {
				throw new Error("VaultTaskCache: Task id is not defined");
			}
			cache.set(task.task.id, task);
		})
		this.cache = cache;
		this.changesMade = true;
		await this.saveCacheToDisk();
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

		this.changesMade = true;

		if (this.plugin.settings.saveCacheToDiskImmediately) {
			this.saveCacheToDiskDelayed().then(() => {
				if (this.plugin.settings.debugging) console.log("VaultTaskCache: Saved cache to disk");
			});
		}
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

	getCachedTasks(): PluginTask[] {
		return Array.from(this.cache.values());
	}

	reset() {
		this.cache.clear();
		this.changesMade = true;
	}
}
