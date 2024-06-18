import {ModelsTask} from "../../vikunja_sdk";

interface TaskParser {
	parse(value: string): ModelsTask;
}

interface TaskFormatter {
	format(task: ModelsTask): string;
}

export type {TaskFormatter, TaskParser}
