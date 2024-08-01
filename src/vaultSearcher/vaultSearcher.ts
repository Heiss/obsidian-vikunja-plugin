import {ModelsTask} from "../../vikunja_sdk";
import {TaskParser} from "../taskFormats/taskFormats";
import {TFile} from "obsidian";
import {compareModelTasks} from "../processing/processor";

class PluginTask {
	file: TFile;
	lineno: number;
	task: ModelsTask;

	constructor(file: TFile, lineno: number, task: ModelsTask) {
		this.file = file;
		this.lineno = lineno;
		this.task = task;
	}

	isEquals(pluginTask: PluginTask): boolean {
		const file = this.file.path === pluginTask.file.path;
		const lineno = this.lineno === pluginTask.lineno;
		const task = this.isTaskEqual(pluginTask.task);

		return file && lineno && task;
	}

	isTaskEqual(vikunja: ModelsTask): boolean {
		return compareModelTasks(this.task, vikunja);
	}
}

interface VaultSearcher {
	getTasks(parser: TaskParser): Promise<PluginTask[]>;

	getTasksFromFile(parser: TaskParser, file: TFile): Promise<PluginTask[]>;
}

export type {VaultSearcher};
export {PluginTask};
