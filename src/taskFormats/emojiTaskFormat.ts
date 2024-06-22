import {ModelsLabel, ModelsTask} from "vikunja_sdk";
import {TaskFormatter, TaskParser} from "./taskFormats";
import {App} from "obsidian";
import VikunjaPlugin from "../../main";

const keywords = {
	VIKUNJA_TAG: "#VIKUNJA",
	DUE_DATE: "🗓️|📅|📆|🗓",
	DONE_DATE: "✅",
};

const REGEX = {
	VIKUNJA_TAG: new RegExp(`^[\\s]*[-] \\[[x ]\\] [\\s\\S]*${keywords.VIKUNJA_TAG}[\\s\\S]*$`, "i"),
	VIKUNJA_ID: /\[vikunja_id::\s*\d+\]/,
	VIKUNJA_ID_NUM: /\[vikunja_id::\s*(.*?)\]/,
	VIKUNJA_LINK: /\[link\]\(.*?\)/,
	DUE_DATE_WITH_EMOJ: new RegExp(`(${keywords.DUE_DATE})\\s?\\d{4}-\\d{2}-\\d{2}(T\\d{2}:\\d{2}:\\d{2}Z)?`),
	DUE_DATE: new RegExp(`(?:${keywords.DUE_DATE})\\s?(\\d{4}-\\d{2}-\\d{2})(T\\d{2}:\\d{2}:\\d{2}Z)?`),
	DONE_DATE: new RegExp(`(?:${keywords.DONE_DATE})\\s?(\\d{4}-\\d{2}-\\d{2})(T\\d{2}:\\d{2}:\\d{2}Z)?`),
	PROJECT_NAME: /\[project::\s*(.*?)\]/,
	TASK_CONTENT: {
		REMOVE_PRIORITY: /\s!!([1-4])\s/,
		REMOVE_TAGS: /(^|\s)(#[a-zA-Z\d\u4e00-\u9fa5-]+)/g,
		REMOVE_SPACE: /^\s+|\s+$/g,
		REMOVE_DATE: new RegExp(`(${keywords.DUE_DATE})\\s?\\d{4}-\\d{2}-\\d{2}(T\\d{2}:\\d{2}:\\d{2}Z)?`),
		REMOVE_DONE_DATE: new RegExp(`(${keywords.DONE_DATE})\\s?\\d{4}-\\d{2}-\\d{2}(T\\d{2}:\\d{2}:\\d{2}Z)?`),
		REMOVE_INLINE_METADATA: /%%\[\w+::\s*\w+\]%%/,
		REMOVE_CHECKBOX: /^(-|\*)\s+\[(x|X| )\]\s/,
		REMOVE_CHECKBOX_WITH_INDENTATION: /^([ \t]*)?(-|\*)\s+\[(x|X| )\]\s/,
		REMOVE_VIKUNJA_LINK: /\[link\]\(.*?\)/,
	},
	ALL_TAGS: /#[\w\u4e00-\u9fa5-]+/g,
	TASK_CHECKBOX_CHECKED: /- \[(x|X)\] /,
	TASK_INDENTATION: /^(\s{2,}|\t)(-|\*)\s+\[(x|X| )\]/,
	TAB_INDENTATION: /^(\t+)/,
	TASK_PRIORITY: /\s!!([1-4])\s/,
	BLANK_LINE: /^\s*$/,
	VIKUNJA_EVENT_DATE: /(\d{4})-(\d{2})-(\d{2})(T(\d{2}):(\d{2}))?/
};

class EmojiTaskParser implements TaskParser {
	app: App;
	plugin: VikunjaPlugin;

	constructor(app: App, plugin: VikunjaPlugin) {
		this.app = app;
		this.plugin = plugin;
	}

	/* Parses a string into a task
	 *
	* Examples:
	* - [ ] #task Has a created date ➕ 2023-04-13
	* - [ ] #task Has a scheduled date ⏳ 2023-04-14
	* - [ ] #task Has a start date 🛫 2023-04-15
	* - [ ] #task Has a due date 📅 2023-04-16
	* - [x] #task Has a done date ✅ 2023-04-17
	* - [-] #task Has a cancelled date ❌ 2023-04-18
	*/
	async parse(value: string): Promise<ModelsTask> {
		if (!value.startsWith("- [")) {
			throw new Error("EmojiTaskParser: Invalid task format: " + value);
		}

		const vikunjaId = this.getVikunjaIdFromLineText(value);
		const isCompleted = this.checkIfTaskIsCompleted(value);
		const task: ModelsTask = {
			id: vikunjaId !== null ? vikunjaId : undefined,
			labels: await this.getTagsFromText(value),
			title: this.getTaskContentFromLineText(value),
			dueDate: this.getDueDateFromLineText(value),
			projectId: this.plugin.settings.defaultVikunjaProject,
			done: isCompleted,
			doneAt: this.getDoneDateFromLineText(value),
		};

		if (this.plugin.settings.debugging) console.log("EmojiTaskParser: Task parsed", task);

		return task;
	}

	async getTagsFromText(lineText: string): Promise<ModelsLabel[]> {
		const tags = lineText.match(REGEX.ALL_TAGS);
		if (!tags) {
			if (this.plugin.settings.debugging) console.log("EmojiTaskParser: No tags found in line text", lineText);
			return [];
		}
		if (this.plugin.settings.debugging) console.log("EmojiTaskParser: Tags found in line text", tags);

		let labels: ModelsLabel[] = [];
		for (const tag of tags
			.map(tag => tag
				.replace('#', '')
				.trim()
				.toString())
			) {
			labels.push({title: tag})
		}

		return labels;
	}


	getTaskContentFromLineText(lineText: string): string {
		let taskContent: string = lineText.replace(REGEX.TASK_CONTENT.REMOVE_INLINE_METADATA, "")
			.replace(REGEX.TASK_CONTENT.REMOVE_VIKUNJA_LINK, "")
			.replace(REGEX.TASK_CONTENT.REMOVE_PRIORITY, " ")

		// remove tags with text only if enabled in settings
		if (!this.plugin.settings.useTagsInText) {
			taskContent = taskContent.replace(REGEX.TASK_CONTENT.REMOVE_TAGS, "")
		} else {
			this.plugin.settings.useTagsInTextExceptions.forEach(exceptTag => {
				taskContent = taskContent.replaceAll(exceptTag, "")
			})
			//taskContent = taskContent.replaceAll("#", "")
		}
		taskContent = taskContent.replace(REGEX.TASK_CONTENT.REMOVE_DATE, "")
			.replace(REGEX.TASK_CONTENT.REMOVE_DONE_DATE, "")
			.replace(REGEX.TASK_CONTENT.REMOVE_CHECKBOX, "")
			.replace(REGEX.TASK_CONTENT.REMOVE_CHECKBOX_WITH_INDENTATION, "")
			.replace(REGEX.TASK_CONTENT.REMOVE_SPACE, "")
			.replace(REGEX.VIKUNJA_ID_NUM, "").trim();
		// FIXME VIKUNJA_ID should be removed from the task content and not be in the title... but it is there.

		if (this.plugin.settings.debugging) console.log("EmojiTaskParser: Task content parsed", taskContent);

		return (taskContent)
	}

	/*
	 * Extracts the due date from a line of text.
	 * Returns null if no due date is found.
	 */
	getDueDateFromLineText(text: string): string | undefined {
		const date = REGEX.DUE_DATE.exec(text);
		if (!date || date[1] === undefined) {
			return undefined;
		}
		const day = date[1];

		let time = "12:00:00"
		// check for time
		if (date[2] !== undefined) {
			time = date[2]
		}
		const result = `${day}T${time}Z`;
		if (this.plugin.settings.debugging) console.log("EmojiTaskParser: Due date parsed", result);
		return result;
	}

	getVikunjaIdFromLineText(text: string): number | null {
		const result = REGEX.VIKUNJA_ID_NUM.exec(text);
		return result ? parseInt(result[1]) : null;
	}

	private checkIfTaskIsCompleted(value: string) {
		return REGEX.TASK_CHECKBOX_CHECKED.test(value);
	}

	private getDoneDateFromLineText(value: string): string | undefined {
		const date = REGEX.DONE_DATE.exec(value);
		if (!date || date[1] === undefined) {
			return undefined;
		}

		const day = date[1];
		let time = "12:00:00"
		// check for time
		if (date[2] !== undefined) {
			time = date[2]
		}
		const result = `${day}T${time}Z`;
		if (this.plugin.settings.debugging) console.log("EmojiTaskParser: Done date parsed", result);
		return result;
	}
}

class EmojiTaskFormatter implements TaskFormatter {
	plugin: VikunjaPlugin;

	constructor(app: App, plugin: VikunjaPlugin) {
		this.plugin = plugin;
	}

	async format(task: ModelsTask): Promise<string> {
		if (!task.title) throw new Error("EmojiTaskFormatter: Task title is required");

		let additionalContent = [task.title];

		if (task.dueDate && task.dueDate !== "0001-01-01T00:00:00Z") {
			const dueDate = task.dueDate.split("T")[0];
			const dueDateText = `📅 ${dueDate}`;
			additionalContent.push(dueDateText);
		}

		if (!this.plugin.settings.useTagsInText && task.labels) {
			task.labels.forEach(label => {
				const taskTagsText = `#${label.title}`;
				additionalContent.push(taskTagsText);
			});
		}

		const vikunjaLink = `${this.plugin.settings.vikunjaHost}/tasks/${task.id}`
		const link = `[link](${vikunjaLink})`
		additionalContent.push(link);
		additionalContent.push(`[vikunja_id:: ${task.id}]`);

		if (task.doneAt && task.doneAt !== "0001-01-01T00:00:00Z") {
			const doneDate = task.doneAt.split("T")[0];
			const doneDateText = `✅ ${doneDate}`;
			additionalContent.push(doneDateText);
		}

		const additionalContentText = additionalContent.join(" ");

		const result = `- [${task.done ? "x" : " "}] ${additionalContentText}`;
		if (this.plugin.settings.debugging) console.log("EmojiTaskFormatter: Task formatted", result);

		return result;
	}
}

export {EmojiTaskParser, EmojiTaskFormatter, REGEX}
