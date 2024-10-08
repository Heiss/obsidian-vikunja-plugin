import VikunjaPlugin from "../../main";
import {App} from "obsidian";
import {ModelsTask} from "../../vikunja_sdk";
import {PluginTask} from "../vaultSearcher/vaultSearcher";
import {GetTasks} from "./getTasks";
import {RemoveTasks} from "./removeTasks";
import UpdateTasks from "./updateTasks";
import CreateTasks from "./createTasks";
import {Processor} from "./processor";
import {SyncLabels} from "./syncLabels";

interface StepsOutput {
	localTasks: PluginTask[];
	vikunjaTasks: ModelsTask[];
}

interface IAutomatonSteps {
	step(localTasks: PluginTask[], vikunjaTasks: ModelsTask[]): Promise<StepsOutput>;

}

enum AutomatonStatus {
	READY,
	RUNNING,
	ERROR,
	FINISHED,
}

class Automaton {
	app: App;
	plugin: VikunjaPlugin;
	steps: IAutomatonSteps[];
	currentStep: number = 0;
	status: AutomatonStatus;
	processor: Processor;

	constructor(app: App, plugin: VikunjaPlugin, processor: Processor) {
		this.app = app;
		this.plugin = plugin;
		this.processor = processor;

		this.steps = [
			new RemoveTasks(app, plugin),
			new SyncLabels(app, plugin),
			new CreateTasks(app, plugin, processor),
			new UpdateTasks(app, plugin, processor),
		];

		this.status = AutomatonStatus.READY;
	}

	/*
	* Run the automaton with the given tasks. If no tasks are given, the automaton will fetch the tasks from Vikunja.
	*/
	async run(tasks: StepsOutput | undefined = undefined) {
		let localTasks: PluginTask[] = [];
		let vikunjaTasks: ModelsTask[] = [];
		this.status = AutomatonStatus.RUNNING;

		if (tasks === undefined) {
			this.steps.unshift(new GetTasks(this.app, this.plugin, this.processor));
		} else {
			localTasks = tasks.localTasks;
			vikunjaTasks = tasks.vikunjaTasks;
		}

		while (this.currentStep < this.steps.length) {
			let output: StepsOutput;
			try {
				output = await this.execStep(localTasks, vikunjaTasks);
			} catch (e) {
				this.status = AutomatonStatus.ERROR;
				console.error("Automaton: Error in step " + this.currentStep + ", Error: " + e);
				return;
			}
			localTasks = output.localTasks;
			vikunjaTasks = output.vikunjaTasks;
		}

		this.status = AutomatonStatus.FINISHED;
	}

	private async execStep(localTasks: PluginTask[], vikunjaTasks: ModelsTask[]): Promise<StepsOutput> {
		return this.steps[this.currentStep++].step(localTasks, vikunjaTasks);
	}

}

export {Automaton, AutomatonStatus};
export type {IAutomatonSteps, StepsOutput,};
