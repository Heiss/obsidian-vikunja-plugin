import {ModelsTask} from "../../vikunja_sdk";
import VikunjaPlugin from "../../main";
import {App} from "obsidian";

/*
 * This interface is used to parse a task from a string
 */
interface TaskParser {
	/*
	 * Parses a string into a task.
	 * Throws an error if the string is not a valid task
	 */
	parse(value: string): ModelsTask;
}

interface TaskFormatter {
	format(task: ModelsTask): string;
}

export type {TaskFormatter, TaskParser}
