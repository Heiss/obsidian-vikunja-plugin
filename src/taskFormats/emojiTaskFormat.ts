import {ModelsTask} from "vikunja_sdk";
import {TaskFormatter, TaskParser} from "./taskFormats";

class EmojiTaskParser implements TaskParser {
	parse(value: string): ModelsTask {
		throw new Error("Method not implemented.");
	}
}

class EmojiTaskFormatter implements TaskFormatter {
	format(task: ModelsTask): string {
		throw new Error("Method not implemented.");
	}
}

export {EmojiTaskParser, EmojiTaskFormatter}
