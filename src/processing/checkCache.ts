import {PluginTask} from "src/vaultSearcher/vaultSearcher";
import {ModelsTask} from "vikunja_sdk";
import {IAutomatonSteps, StepsOutput} from "./automaton";
import VikunjaPlugin from "../../main";
import {App} from "obsidian";
import {compareModelTasks, Processor} from "./processor";

export default class CheckCache implements IAutomatonSteps {
	plugin: VikunjaPlugin;
	app: App;
	processor: Processor;

	constructor(plugin: VikunjaPlugin, app: App, processor: Processor) {
		this.plugin = plugin;
		this.app = app;
		this.processor = processor;
	}

	async step(localTasks: PluginTask[], vikunjaTasks: ModelsTask[]): Promise<StepsOutput> {
		this.updateCacheFromVault(localTasks);
		return {localTasks, vikunjaTasks};
	}

	updateCacheFromVault(localTasks: PluginTask[]) {
		const tasksWithId = localTasks.filter(task => {
				if (task.task.id === undefined) return false; // task has no id, so it is not in the cache, because not synced to vikunja

				const elem = this.plugin.cache.get(task.task.id)
				if (elem === undefined) return false; // task is not in the cache, because not synced to vikunja

				return !compareModelTasks(elem.task, task.task); // filter elem, if it is equal to task in cache. False filters out.
			}
		);

		if (tasksWithId.length === 0) {
			if (this.plugin.settings.debugging) console.log("Step CheckCache: No changes in vault found. Cache is up to date.");
			return;
		}
		if (this.plugin.settings.debugging) console.log("Step CheckCache: Something changed the vault without obsidian! Invalidate cache and creating anew");
	}
}
