import {ModelsTask} from "../../vikunja_sdk";
import {TaskParser} from "../taskFormats/taskFormats";
import {TFile} from "obsidian";

interface PluginTask {
	file: TFile;
	lineno: number;
	task: ModelsTask;
}

interface VaultSearcher {
	getTasks(parser: TaskParser): Promise<PluginTask[]>;
}

export type {VaultSearcher, PluginTask};
