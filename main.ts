import {Notice, Plugin} from 'obsidian';
import {DEFAULT_SETTINGS, SettingTab, VikunjaPluginSettings} from "./src/settings/settingTab";
import {Tasks} from "./src/vikunja/tasks";
import {Processor} from "./src/processing/processor";
import {UserUser} from "./vikunja_sdk";
import {Label} from "./src/vikunja/labels";
import Commands from "./src/commands";

// Remember to rename these classes and interfaces!

export default class VikunjaPlugin extends Plugin {
	settings: VikunjaPluginSettings;
	tasksApi: Tasks;
	userObject: UserUser | undefined;
	labelsApi: Label;
	processor: Processor;
	commands: Commands;

	async onload() {
		await this.loadSettings();
		this.commands = new Commands(this.app, this);

		this.commands.checkDependencies();
		this.tasksApi = new Tasks(this.app, this);
		this.userObject = undefined;
		this.labelsApi = new Label(this.app, this);

		this.setupObsidian();
		await this.processor.updateTasksOnStartup();
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}


	async checkLastLineForUpdate() {
		if (this.settings.debugging) console.log("Checking for task update");
		const updateTask = await this.processor.checkUpdateInLineAvailable()
		if (!!updateTask) {
			await this.tasksApi.updateTask(updateTask.task);
		} else {
			if (this.settings.debugging) console.log("No task to update found");
		}
	}

	setupObsidian() {
		this.processor = new Processor(this.app, this);
		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('refresh-cw', 'Vikunja: Trigger sync', async (_evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('Start syncing with Vikunja');
			await this.processor.exec();
		});
		this.setupCommands();

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SettingTab(this.app, this));

		this.registerDomEvent(document, 'keyup', this.handleUpDownEvent.bind(this));
		this.registerDomEvent(document, 'click', this.handleClickEvent.bind(this));
		this.registerEvent(this.app.workspace.on('editor-change', this.handleEditorChange.bind(this)));

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window
			.setInterval(async () => {
					// this runs anyway, also when cron not enabled, to be dynamically enabled by settings without disable/enable plugin
					if (this.settings.enableCron) {
						await this.processor.exec()
					}
				},
				this.settings.cronInterval * 1000)
		);
	}

	private setupCommands() {
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'vikunja-execute-sync',
			name: 'Trigger sync with Vikunja',
			callback: async () => {
				await this.processor.exec();
			}
		});
		this.addCommand({
			id: 'vikunja-pull-tasks',
			name: 'Pull tasks from Vikunja',
			callback: async () => {
				await this.commands.pullTasksFromVikunja();
			}
		})
		this.addCommand({
			id: 'vikunja-move-tasks-to-default-project',
			name: 'Move all tasks to default project',
			callback: async () => {
				await this.commands.moveAllTasksToDefaultProject();
			}
		})
	}

	private async handleEditorChange() {
		if (this.settings.debugging) console.log("Editor changed");
		return;
		//await this.checkLastLineForUpdate();
	}

	private async handleUpDownEvent(evt: KeyboardEvent) {
		if (evt.key === 'ArrowUp' || evt.key === 'ArrowDown' || evt.key === 'PageUp' || evt.key === 'PageDown') {
			await this.checkLastLineForUpdate();
		}
	}

	private async handleClickEvent(evt: MouseEvent) {
		const target = evt.target as HTMLInputElement;
		if (this.app.workspace.activeEditor?.editor?.hasFocus()) {
			await this.checkLastLineForUpdate();
		}
		if (target.type === "checkbox") {
			if (this.settings.debugging) console.log("Checkbox clicked");
			const taskElement = target.closest("div");
			if (!taskElement) {
				if (this.settings.debugging) console.log("No task element found for checkbox");
				return;
			}
			if (this.settings.debugging) console.log("Task element found for checkbox", taskElement.textContent);
			const regex = /\svikunja_id(\d+)\s*/; // this ugly stuff is needed, because textContent remove all markdown related stuff
			const match = taskElement.textContent?.match(regex) || false;
			if (match) {
				const taskId = parseInt(match[1]);
				if (this.settings.debugging) console.log("Checkbox clicked for task", taskId);
				const task = await this.tasksApi.getTaskById(taskId);
				task.done = target.checked;
				await this.tasksApi.updateTask(task);
			} else {
				if (this.settings.debugging) console.log("No task id found for checkbox");
			}
		}
	}
}

