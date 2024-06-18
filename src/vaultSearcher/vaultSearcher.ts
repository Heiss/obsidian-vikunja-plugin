import {ModelsTask} from "../../vikunja_sdk";
import {TaskParser} from "../taskFormats/taskFormats";

export interface VaultSearcher {
	getTasks(parser: TaskParser): ModelsTask[];
}
