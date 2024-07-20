import {IAutomatonSteps, StepsOutput} from "./automaton";
import {PluginTask} from "../vaultSearcher/vaultSearcher";
import {ModelsTask} from "../../vikunja_sdk";
import {App} from "obsidian";
import VikunjaPlugin from "../../main";
import {Processor} from "./processor";

class CreateTasks implements IAutomatonSteps {
	app: App;
	plugin: VikunjaPlugin;
	processor: Processor;

	constructor(app: App, plugin: VikunjaPlugin, processor: Processor) {
		this.app = app;
		this.plugin = plugin;
		this.processor = processor;
	}

	async step(localTasks: PluginTask[], vikunjaTasks: ModelsTask[]): Promise<StepsOutput> {
		await this.createTasks(localTasks, vikunjaTasks);
		return {localTasks, vikunjaTasks};
	}

	private async createTasks(localTasks: PluginTask[], vikunjaTasks: ModelsTask[]) {
		if (this.plugin.settings.debugging) console.log("Step CreateTask: Creating tasks in Vikunja and vault", localTasks, vikunjaTasks);
		await this.processor.pullTasksFromVikunjaToVault(localTasks, vikunjaTasks);
		await this.processor.pushTasksFromVaultToVikunja(localTasks, vikunjaTasks);
	}


}

export default CreateTasks;
