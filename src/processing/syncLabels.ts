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
		await this.removeLabelsInVikunjaIfNotInVault(localTasks, vikunjaTasks);
		const localTasksWithLabels: PluginTask[] = await this.createLabels(localTasks);

		// FIXME there is still a bug with previously added labels... something is empty in devlog
		for (const task of localTasksWithLabels) {
			if (!task.task) throw new Error("Task is not defined");
			if (!task.task.id) throw new Error("Task id is not defined");
			const taskId = task.task.id;
			if (!task.task.labels || task.task.labels.length === 0) continue;

			for (const label of task.task.labels) {
				if (this.plugin.settings.debugging) console.log("Step SyncLabels: Adding label to task ", taskId, " in Vikunja", label);
				try {
					await this.plugin.labelsApi.addLabelToTask(taskId, label);
				} catch (e) {
					console.error("Error adding label to task", e);
				}
			}
		}

		return {localTasks: localTasksWithLabels, vikunjaTasks: vikunjaTasks};
	}

	private async removeLabelsInVikunjaIfNotInVault(localTasks: PluginTask[], _vikunjaTasks: ModelsTask[]) {
		if (this.plugin.settings.debugging) console.log("Step SyncLabels: Deleting labels in Vikunja if not in vault.");
		if (!this.plugin.settings.removeLabelsIfInVaultNotUsed) {
			if (this.plugin.settings.debugging) console.log("Step SyncLabels: Not deleting labels in vikunja if ID not found in vault");
			return;
		}
		const allLabels = await this.plugin.labelsApi.getLabels();
		const usedLabels = localTasks.flatMap(task => task.task.labels ?? []);

		for (const label of allLabels) {
			if (usedLabels.find(usedLabel => usedLabel.title === label.title)) {
				continue;
			}

			if (this.plugin.settings.debugging) console.log("Step SyncLabels: Deleting label in vikunja", label);
			if (!label.id) throw new Error("Label id is not defined");
			await this.plugin.labelsApi.deleteLabel(label.id);
		}
	}

	private async createLabels(localTasks: PluginTask[]): Promise<PluginTask[]> {
		if (this.plugin.settings.debugging) console.log("Step SyncLabels: Creating labels in Vikunja if not existing.");
		return await Promise.all(localTasks
			.map(async task => {
					if (!task.task) throw new Error("Task is not defined");
					if (!task.task.labels) return task;

					task.task.labels = await this.plugin.labelsApi.getAndCreateLabels(task.task.labels);
					if (this.plugin.settings.debugging) console.log("Step SyncLabels: Preparing labels for local tasks for vikunja update", task);
					return task;
				}
			));
	}
}

export {SyncLabels};
