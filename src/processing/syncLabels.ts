import {PluginTask} from "src/vaultSearcher/vaultSearcher";
import {ModelsTask} from "vikunja_sdk";
import {IAutomatonSteps, StepsOutput} from "./automaton";
import {App} from "obsidian";
import VikunjaPlugin from "../../main";

class SyncLabels implements IAutomatonSteps {
	app: App;
	plugin: VikunjaPlugin;

	constructor(app: App, plugin: VikunjaPlugin) {
		this.app = app;
		this.plugin = plugin;
	}

	async step(localTasks: PluginTask[], vikunjaTasks: ModelsTask[]): Promise<StepsOutput> {
		await this.removeLabelsInVikunjaIfNotInVault(localTasks);
		const localTasksWithLabels: PluginTask[] = await this.createLabels(localTasks);

		return {localTasks: localTasksWithLabels, vikunjaTasks: vikunjaTasks};
	}

	private async removeLabelsInVikunjaIfNotInVault(localTasks: PluginTask[]) {
		if (this.plugin.settings.debugging) console.log("Step SyncLabels: Deleting labels in Vikunja if not in vault.");

		const allLabels = this.plugin.labelsApi.getLabels();
		const dedupAllLabels = allLabels.filter((label, index, self) => self.findIndex(l => l.title === label.title) === index);
		// remove all duplicated labels
		await Promise.all(allLabels.filter(label => dedupAllLabels.find(l => l.id === label.id) === undefined).map(label => label.id && this.plugin.labelsApi.deleteLabel(label)));

		if (!this.plugin.settings.removeLabelsIfInVaultNotUsed) {
			if (this.plugin.settings.debugging) console.log("Step SyncLabels: Not deleting labels in vikunja if ID not found in vault");
			return;
		}
		const usedLabels = localTasks.flatMap(task => task.task.labels ?? []);
		const labelsToDelete = dedupAllLabels.filter(label => usedLabels.find(l => l.title === label.title) === undefined);

		if (this.plugin.settings.debugging) console.log("Step SyncLabels: Deleting labels in Vikunja", labelsToDelete);
		// remove all labels not used in vault
		await Promise.all(labelsToDelete.map(label => label.id && this.plugin.labelsApi.deleteLabel(label)));
	}

	private async createLabels(localTasks: PluginTask[]): Promise<PluginTask[]> {
		if (this.plugin.settings.debugging) console.log("Step SyncLabels: Creating labels in Vikunja if not existing.");

		return await Promise.all(localTasks
			.map(async task => {
					if (!task.task) throw new Error("Task is not defined");
					if (!task.task.labels) return task;

					task.task.labels = await this.plugin.labelsApi.getOrCreateLabels(task.task.labels);
					if (this.plugin.settings.debugging) console.log("Step SyncLabels: Preparing labels for local tasks for vikunja update", task);
					return task;
				}
			));
	}
}

export {SyncLabels};
