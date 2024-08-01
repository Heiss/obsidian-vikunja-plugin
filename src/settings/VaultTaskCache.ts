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

	constructor(app: App, plugin: VikunjaPlugin) {
		this.app = app;
		this.plugin = plugin;
	}

	async saveCacheToDisk() {
		await this.plugin.saveSettings();
	}

	update(local: PluginTask) {
		if (local.task.id === undefined) {
			throw new Error("VaultTaskCache: Task id is not defined");
		}
		const currentDate = moment().format("YYYY-MM-DDTHH:mm:ss[Z]");
		if (this.plugin.settings.debugging) console.log("VaultTaskCache: Updating task", local.task.id, "with updated date", currentDate);
		local.task.updated = currentDate;

		this.plugin.settings.cache.set(local.task.id, local);
	}

	get(id: number): PluginTask | undefined {
		return this.plugin.settings.cache.get(id);
	}

	/*
	* Useful, when tasks are updated in vikunja and so the task in the cache is outdated.
	*/
	delete(id: number) {
		this.plugin.settings.cache.delete(id);
	}

	/*
	* Do not forget to call delete after processing the tasks.
	*/
	getCachedTasks(): PluginTask[] {
		return Array.from(this.plugin.settings.cache.values());
	}

	reset() {
		this.plugin.settings.cache.clear();
	}
}
