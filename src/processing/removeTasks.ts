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
		//const localTasks = await this.removeTasksInVault(localTasksBeforeDeletion, vikunjaTasksBeforeDeletion);
		return {localTasks, vikunjaTasks};
	}

	private async removeTasksInVikunja(localTasks: PluginTask[], vikunjaTasksBeforeDeletion: ModelsTask[]) {
		const deletedVikunjaTasks = await this.removeTasksInVikunjaIfTasksNotInVaultButInCache(localTasks);
		if (this.plugin.settings.debugging) console.log("Step RemoveTask: Deleted tasks in Vikunja", deletedVikunjaTasks);
		return vikunjaTasksBeforeDeletion.filter(task => !deletedVikunjaTasks.find(deletedTask => deletedTask.id === task.id));
	}

	private async removeTasksInVaultIfTasksNotInVikunjaButInCache(vikunjaTasks: ModelsTask[]): Promise<PluginTask[]> {
		const taskToDeleteInVault = this.plugin.cache.getCachedTasks().filter(task => !vikunjaTasks.find(vaultTask => vaultTask.id === task.task.id));
		if (this.plugin.settings.debugging) console.log("Step RemoveTask: Deleting tasks in vault which are not in vikunja but in cache", taskToDeleteInVault);
		await Promise.all(taskToDeleteInVault.map(async task => {
			await this.plugin.processor.removeFromVault(task);
		}));
		return taskToDeleteInVault;
	}

	private async removeTasksInVikunjaIfTasksNotInVaultButInCache(localTasks: PluginTask[]): Promise<ModelsTask[]> {
		let tasksFoundInCacheButNotInVault = this.plugin.cache.getCachedTasks().filter(task => !localTasks.find(vaultTask => vaultTask.task.id === task.task.id)).map(task => task.task);
		if (this.plugin.settings.debugging) console.log("Step RemoveTask: Deleting tasks in vikunja which are not in vault but in cache", tasksFoundInCacheButNotInVault);
		if (this.plugin.settings.removeTasksOnlyInDefaultProject) {
			tasksFoundInCacheButNotInVault = tasksFoundInCacheButNotInVault.filter(task => task.projectId === this.plugin.settings.defaultVikunjaProject);
			if (this.plugin.settings.debugging) console.log("Step RemoveTask: Filtered tasks to only default project", tasksFoundInCacheButNotInVault);
		}
		await this.plugin.tasksApi.deleteTasks(tasksFoundInCacheButNotInVault);
		return tasksFoundInCacheButNotInVault;
	}

	private async removeTasksInVault(localTasks: PluginTask[], vikunjaTasksBeforeDeletion: ModelsTask[]): Promise<PluginTask[]> {
		const deleteVaultTasksFromCache = await this.removeTasksInVaultIfTasksNotInVikunjaButInCache(vikunjaTasksBeforeDeletion);
		if (this.plugin.settings.debugging) console.log("Step RemoveTask: Deleted tasks in Vault", deleteVaultTasksFromCache);
		return localTasks.filter(task => !deleteVaultTasksFromCache.find(deletedTask => deletedTask.task.id === task.task.id));
	}
}

export {RemoveTasks};
