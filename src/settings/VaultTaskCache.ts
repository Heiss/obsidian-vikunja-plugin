import VikunjaPlugin from "../../main";
import {App, moment} from "obsidian";
import {PluginTask} from "../vaultSearcher/vaultSearcher";

/*
* This class is used to cache tasks which are updated in Vault, but not in Vikunja.
* This should help to identify modifications in vault without Obsidian.
* Also it makes it possible to update only modified tasks. See issue #9 for more details.
*/
export default class VaultTaskCache {
	plugin: VikunjaPlugin;
	app: App;
	changesMade: boolean;

	constructor(app: App, plugin: VikunjaPlugin) {
		this.app = app;
		this.plugin = plugin;
		this.changesMade = false;
	}

	async saveCacheToDisk() {
		if (this.changesMade) {
			await this.plugin.saveSettings();
		}
		this.changesMade = false;
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
		this.plugin.settings.cache.set(local.task.id, local);
		this.changesMade = true;
	}

	get(id: number): PluginTask | undefined {
		return this.plugin.settings.cache.get(id);
	}

	/*
	* Useful, when tasks are updated in vikunja and so the task in the cache is outdated.
	*/
	delete(id: number) {
		this.plugin.settings.cache.delete(id);
		this.changesMade = true;
	}

	/*
	* Do not forget to call delete after processing the tasks.
	*/
	getCachedTasks(): PluginTask[] {
		return Array.from(this.plugin.settings.cache.values());
	}

	reset() {
		this.plugin.settings.cache.clear();
		this.changesMade = true;
	}
}
