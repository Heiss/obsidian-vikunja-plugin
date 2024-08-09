import {PluginTask, VaultSearcher} from "src/vaultSearcher/vaultSearcher";
import {ModelsTask} from "vikunja_sdk";
import {IAutomatonSteps, StepsOutput} from "./automaton";
import VikunjaPlugin from "../../main";
import {App} from "obsidian";
import {TaskParser} from "../taskFormats/taskFormats";
import {Processor} from "./processor";
import {backendToFindTasks} from "../enums";

class GetTasks implements IAutomatonSteps {
	app: App;
	plugin: VikunjaPlugin;
	vaultSearcher: VaultSearcher;
	taskParser: TaskParser;
	processor: Processor;

	constructor(app: App, plugin: VikunjaPlugin, processor: Processor) {
		this.app = app;
		this.plugin = plugin;
		this.processor = processor;

		this.vaultSearcher = this.processor.getVaultSearcher();
		this.taskParser = this.processor.getTaskParser();
	}

	async step(_1: PluginTask[], _2: ModelsTask[]): Promise<StepsOutput> {
		let [localTasks, vikunjaTasks] = await Promise.all([this.getTasksFromVault(), this.getTasksFromVikunja()]);

		if (this.plugin.settings.pullTasksOnlyFromDefaultProject) {
			if (this.plugin.settings.debugging) console.log("Step GetTask: Filtering tasks to only default project");
			const defaultProjectId = this.plugin.settings.defaultVikunjaProject;
			vikunjaTasks = vikunjaTasks.filter(task => task.projectId === defaultProjectId);
			if (this.plugin.settings.debugging) console.log("Step GetTask: Filtered tasks to only default project", vikunjaTasks);
		}

		return {localTasks, vikunjaTasks};
	}

	private async getTasksFromVault(): Promise<PluginTask[]> {
		if (this.plugin.settings.debugging) console.log("Step GetTask: Pulling tasks from vault");
		return await this.vaultSearcher.getTasks(this.taskParser);
	}

	private async getTasksFromVikunja(): Promise<ModelsTask[]> {
		const tasks = await this.plugin.tasksApi.getAllTasks();
		if (this.plugin.settings.debugging) console.log("Step GetTask: Got tasks from Vikunja", tasks);
		return tasks;
	}

}


export {GetTasks};
