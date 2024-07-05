import {IAutomatonSteps, StepsOutput} from "./automaton";
import {PluginTask} from "../vaultSearcher/vaultSearcher";
import {ModelsTask} from "../../vikunja_sdk";
import {App} from "obsidian";
import VikunjaPlugin from "../../main";

class RemoveTasks implements IAutomatonSteps {
	app: App;
	plugin: VikunjaPlugin;

	constructor(app: App, plugin: VikunjaPlugin) {
		this.app = app;
		this.plugin = plugin;
	}

	async step(localTasks: PluginTask[], vikunjaTasksBeforeDeletion: ModelsTask[]): Promise<StepsOutput> {
		const vikunjaTasks = await this.removeTasksInVikunja(localTasks, vikunjaTasksBeforeDeletion);
		return {localTasks, vikunjaTasks};
	}

	private async removeTasksInVikunja(localTasks: PluginTask[], vikunjaTasksBeforeDeletion: ModelsTask[]) {
		if (this.plugin.settings.debugging) console.log("Step RemoveTask: Deleting tasks and labels in Vikunja");
		const deletedVikunjaTasks = await this.removeTasksInVikunjaIfNotInVault(localTasks, vikunjaTasksBeforeDeletion);
		// Filter out deleted tasks
		return vikunjaTasksBeforeDeletion.filter(task => !deletedVikunjaTasks.find(deletedTask => deletedTask.id === task.id));
	}

	/*
	 * Remove tasks in Vikunja if they are not in the vault anymore.
	 * Returns the tasks which are not in the vault anymore. Filter it yourself if needed.
	 */
	private async removeTasksInVikunjaIfNotInVault(localTasks: PluginTask[], vikunjaTasks: ModelsTask[]): Promise<ModelsTask[]> {
		// Check placed here, so no wrong deletion happens
		if (!this.plugin.settings.removeTasksIfInVaultNotFound) {
			if (this.plugin.settings.debugging) console.log("Step RemoveTask: Not deleting tasks in vikunja if ID not found in vault");
			return [];
		}

		let tasksToDeleteInVikunja = vikunjaTasks.filter(task => !localTasks.find(vaultTask => vaultTask.task.id === task.id));
		if (this.plugin.settings.debugging) console.log("Step RemoveTask: Deleting tasks in vikunja", tasksToDeleteInVikunja);

		if (this.plugin.settings.removeTasksOnlyInDefaultProject) {
			tasksToDeleteInVikunja = tasksToDeleteInVikunja.filter(task => task.projectId === this.plugin.settings.defaultVikunjaProject);
		}
		await this.plugin.tasksApi.deleteTasks(tasksToDeleteInVikunja);

		return tasksToDeleteInVikunja;
	}

}

export {RemoveTasks};
