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
	/*
	 * Formats a task into a string.
	 * Throws an error if the task is not valid, e.g. missing required title
	 *
	 * The returned string have to follow the following format:
	 * - [<done status>] <title of the task> <tags of the task> <due date> <done date> <link to corresponding vikunja task> [vikunja_id:: <id of the vikunja task>]
	 *
	 * For example, take a look at `EmojiTaskFormatter.format` in emojiTaskFormat.ts
	 */
	format(task: ModelsTask): string;

	/*
	* Formats a task into a string, which does not have any additional metadata.
	* This is useful, if you do not want to include any vikunja informations in your content.
	*/
	formatRaw(task: ModelsTask): string;
}

export type {TaskFormatter, TaskParser}
