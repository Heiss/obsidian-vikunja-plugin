import VikunjaPlugin from "../../main";
import {App} from "obsidian";
import {backendToFindTasks, supportedTasksPluginsFormat} from "../enums";
import {VaultSearcher} from "../vaultSearcher/vaultSearcher";
import {DataviewSearcher} from "../vaultSearcher/dataviewSearcher";
import {TaskParser} from "../taskFormats/taskFormats";
import {EmojiTaskParser} from "../taskFormats/emojiTaskFormat";

class Processor {
	app: App;
	plugin: VikunjaPlugin;

	constructor(app: App, plugin: VikunjaPlugin) {
		this.app = app;
		this.plugin = plugin;
	}

	exec() {
		if (this.plugin.settings.debugging) console.log("Start processing");

		// Prepare vaultSearcher & taskParser
		let vaultSearcher: VaultSearcher;
		switch (this.plugin.settings.backendToFindTasks) {
			case backendToFindTasks.Dataview:
				// Prepare dataview
				vaultSearcher = new DataviewSearcher(this.app, this.plugin);
				break;
			default:
				throw new Error("No valid backend to find tasks in vault selected");
		}

		let taskParser: TaskParser;
		switch (this.plugin.settings.useTasksFormat) {
			case supportedTasksPluginsFormat.Emoji:
				taskParser = new EmojiTaskParser();
				break;
			default:
				throw new Error("No valid TaskFormat selected");
		}


		// Processing task logic for local processing here
		const localTasks = vaultSearcher.getTasks(taskParser);

		// Pull all tasks from vikunja here
		const vikunjaTasks = this.plugin.vikunjaTasksApi.getAllTasks();

		// Find vikunja tasks that are not in the vault and vice versa

		// Pull new tasks from vikunja to the vault

		// Push new tasks from the vault to vikunja

		// Update the vault with the updated tasks from vikunja

		// Update vikunja with the updated tasks from the vault

		if (this.plugin.settings.debugging) console.log("End processing");

	}
}

export {Processor};
