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

	/*
	* This function is used to wait for the dataview index to be ready.
	* Because dataview only indexing, if something changed, but sync does not know if anything changed recently,
	* we need to trigger it manually.
	 */
	private async handleDataviewIndex() {
		const currentFile = this.app.workspace.getActiveFile();
		if (!currentFile) {
			throw new Error("No active file");
		}
		let dataViewIndexReady = false;
		// @ts-ignore
		this.plugin.registerEvent(this.plugin.app.metadataCache.on("dataview:metadata-change", () => {
			dataViewIndexReady = true;
		}));

		do {
			if (this.plugin.settings.debugging) console.log("Step GetTask: Waiting for dataview index to be ready");
			await new Promise(resolve => setTimeout(resolve, 1000));
			this.app.metadataCache.trigger("resolve", currentFile);
		} while (!dataViewIndexReady)

	}

	private async getTasksFromVault(): Promise<PluginTask[]> {
		if (this.plugin.settings.backendToFindTasks === backendToFindTasks.Dataview) {
			await this.handleDataviewIndex();
		}

		if (this.plugin.settings.updateOnCursorMovement) {
			const tasks = this.plugin.cache.getCachedTasks();
			if (this.plugin.settings.debugging) console.log("GetTasks: Using cache", tasks);
			return tasks;
		}
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
