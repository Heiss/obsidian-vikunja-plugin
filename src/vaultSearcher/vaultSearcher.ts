import {ModelsTask, ModelsTaskFromJSON, ModelsTaskToJSON} from "../../vikunja_sdk";
import {TaskParser} from "../taskFormats/taskFormats";
import {TFile} from "obsidian";
import {compareModelTasks} from "../processing/processor";

class PluginTask {
	filepath: string;
	lineno: number;
	task: ModelsTask;

	constructor(filepath: string, lineno: number, task: ModelsTask) {
		this.filepath = filepath;
		this.lineno = lineno;
		this.task = task;
	}

	public static fromJson(json: any): PluginTask | undefined {
		try {
			const file = json["file"];
			const lineno = json["lineno"];
			const taskObj = json["task"];
			const task = ModelsTaskFromJSON(taskObj);

			return new PluginTask(file, lineno, task);
		} catch (error) {
			console.error("Error parsing json", json, error);
			return undefined;
		}
	}

	public toJson(): any {
		return {
			file: this.filepath,
			lineno: this.lineno,
			task: ModelsTaskToJSON(this.task)
		};

	}

	isEquals(pluginTask: PluginTask): boolean {
		const file = this.filepath === pluginTask.filepath;
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
