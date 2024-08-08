import {IAutomatonSteps, StepsOutput} from "./automaton";
import {PluginTask} from "../vaultSearcher/vaultSearcher";
import {ModelsTask} from "../../vikunja_sdk";
import {App} from "obsidian";
import VikunjaPlugin from "../../main";
import {Processor} from "./processor";

interface UpdatedSplit {
	tasksToUpdateInVault: PluginTask[];
	tasksToUpdateInVikunja: PluginTask[];
}

class UpdateTasks implements IAutomatonSteps {
	app: App;
	plugin: VikunjaPlugin;
	processor: Processor;

	constructor(app: App, plugin: VikunjaPlugin, processor: Processor) {
		this.app = app;
		this.plugin = plugin;
		this.processor = processor;
	}

	async step(localTasks: PluginTask[], vikunjaTasks: ModelsTask[]): Promise<StepsOutput> {
		if (this.plugin.settings.debugging) console.log("Step UpdateTask: Starting update tasks");
		const {
			tasksToUpdateInVault,
			tasksToUpdateInVikunja
		} = this.splitTaskAfterUpdatedStatus(localTasks, vikunjaTasks);
		if (this.plugin.settings.debugging) console.log("Step UpdateTask: Split tasks after updated status, outstanding updates in vault", tasksToUpdateInVault, "outstanding updates in vikunja", tasksToUpdateInVikunja);

		await this.updateTasks(tasksToUpdateInVault, tasksToUpdateInVikunja);

		return {localTasks, vikunjaTasks};
	}


	/*
	 * Split tasks into two groups:
	 * - tasksToUpdateInVault: Tasks which have updates in Vikunja
	 * - tasksToUpdateInVikunja: Tasks which have updates in the vault
	 *
	 * tasksToUpdateInVault has already all informations needed for vault update.
	 */
	private splitTaskAfterUpdatedStatus(localTasks: PluginTask[], vikunjaTasks: ModelsTask[]): UpdatedSplit {
		if (this.plugin.settings.debugging) console.log("Step UpdateTask: Find tasks which have updates on the other platform");

		let tasksToUpdateInVault: PluginTask[] = [];
		let tasksToUpdateInVikunja: PluginTask[] = [];
		for (const task of localTasks) {
			const vikunjaTask = vikunjaTasks.find(vikunjaTask => vikunjaTask.id === task.task.id);
			if (this.plugin.settings.debugging) console.log("Step UpdateTask: found Vikunja task", vikunjaTask, " for Vault task", task.task);
			if (!vikunjaTask) continue;
			if (!vikunjaTask || !vikunjaTask.updated || !task.task.updated) {
				if (this.plugin.settings.debugging) console.log("Step UpdateTask: updated field is not defined", task, vikunjaTask);
				throw new Error("Task updated field is not defined");
			}
			if (task.isTaskEqual(vikunjaTask)) {
				if (this.plugin.settings.debugging) console.log("Step UpdateTask: Task is the same in both platforms", task, vikunjaTask);
				continue;
			}

			let comparison;
			if (vikunjaTask.updated > task.task.updated) {
				task.task = vikunjaTask;
				tasksToUpdateInVault.push(task);
				comparison = "Vikunja";
			} else {
				tasksToUpdateInVikunja.push(task);
				comparison = "Vault";
			}
			if (this.plugin.settings.debugging) console.log(`Step UpdateTask: Task updated will be updated in ${comparison}, updated on vikunja`, vikunjaTask.updated, " updated on vault", task.task.updated);
		}

		return {
			tasksToUpdateInVault,
			tasksToUpdateInVikunja
		};
	}

	private areTasksEqual(local: ModelsTask, vikunja: ModelsTask) {
	}

	private async updateTasks(tasksToUpdateInVault: PluginTask[], tasksToUpdateInVikunja: PluginTask[]) {
		if (this.plugin.settings.debugging) console.log("Step UpdateTask: Updating tasks in vault and Vikunja");
		await this.updateTasksInVikunja(tasksToUpdateInVikunja);
		await this.updateTasksInVault(tasksToUpdateInVault);
	}

	private async updateTasksInVikunja(updateTasks: PluginTask[]) {
		if (this.plugin.settings.debugging) console.log("Step UpdateTask: Update tasks in vikunja");

		await Promise.all(updateTasks.map(async task => {
			const answer = await this.plugin.tasksApi.updateTask(task)
			if (this.plugin.settings.debugging) console.log("Step UpdateTask: Updated task in Vikunja", task, answer);
			task.task = answer;
			await this.updateTasksInVault([task]);
		}));
	}

	private async updateTasksInVault(updateTasks: PluginTask[]) {
		if (this.plugin.settings.debugging) console.log("Step UpdateTask: Update tasks in vault");

		for (const task of updateTasks) {
			await this.processor.updateToVault(task);
		}
	}

}

export default UpdateTasks;
