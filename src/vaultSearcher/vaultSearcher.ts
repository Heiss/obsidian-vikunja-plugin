import {ModelsTask} from "../../vikunja_sdk";
import {TaskParser} from "../taskFormats/taskFormats";
import {TFile} from "obsidian";

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
		const title = this.task.title === vikunja.title;
		const description = this.task.description === vikunja.description;
		const dueDate = this.task.dueDate === vikunja.dueDate;
		const labels = this.task.labels?.filter(label => vikunja.labels?.find(vikunjaLabel => vikunjaLabel.title === label.title)).length === this.task.labels?.length;
		const priority = this.task.priority === vikunja.priority;
		const status = this.task.done === vikunja.done;
		const doneAt = this.task.doneAt === vikunja.doneAt;
		const updated = this.task.updated === vikunja.updated;

		return title && description && dueDate && labels && priority && status && doneAt && updated;
	}
}

interface VaultSearcher {
	getTasks(parser: TaskParser): Promise<PluginTask[]>;
}

export type {VaultSearcher};
export {PluginTask};
