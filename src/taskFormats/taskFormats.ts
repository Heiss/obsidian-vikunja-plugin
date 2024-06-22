import {ModelsTask} from "../../vikunja_sdk";

/*
 * This interface is used to parse a task from a string
 */
interface TaskParser {
	/*
	 * Parses a string into a task.
	 * Throws an error if the string is not a valid task
	 */
	parse(value: string): Promise<ModelsTask>;
}

interface TaskFormatter {
	format(task: ModelsTask): Promise<string>;
}

export type {TaskFormatter, TaskParser}
