import {Notice, Plugin} from 'obsidian';
import {DEFAULT_SETTINGS, MainSetting, VikunjaPluginSettings} from "./src/settings/mainSetting";
import {Tasks} from "./src/vikunja/tasks";
import {Processor} from "./src/processing/processor";
import {UserUser} from "./vikunja_sdk";
import {Label} from "./src/vikunja/labels";
import Commands from "./src/commands";
import {Projects} from "./src/vikunja/projects";
import VaultTaskCache from "./src/settings/VaultTaskCache";

// Remember to rename these classes and interfaces!

export default class VikunjaPlugin extends Plugin {
	settings: VikunjaPluginSettings;
	tasksApi: Tasks;
	userObject: UserUser | undefined;
	labelsApi: Label;
	processor: Processor;
	commands: Commands;
	projectsApi: Projects;
	cache: VaultTaskCache;

	async onload() {
		await this.loadSettings();
		this.commands = new Commands(this.app, this);

		this.setupAPIs();
		this.setupObsidian();

		this.app.workspace.onLayoutReady(async () => {
			if (this.settings.debugging) console.log("Layout ready, check dependencies and start syncing");
			this.commands.checkDependencies();
			await this.processor.updateTasksOnStartup();
		});
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		this.cache = VaultTaskCache.fromJson(this.settings.cache, this.app, this);
	}

	async saveSettings() {
		this.settings.cache = this.cache.getCachedTasks().map(task => {
			return task.toJson();
		});
		await this.saveData(this.settings);
	}

	async checkLastLineForUpdate() {
		if (this.settings.debugging) console.log("Checking for task update");
		const updateTask = await this.processor.checkUpdateInLineAvailable()
		if (updateTask !== undefined) {
			await this.tasksApi.updateTask(updateTask);
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
		this.addSettingTab(new MainSetting(this.app, this));

		this.registerDomEvent(document, 'keyup', this.handleUpDownEvent.bind(this));
		this.registerDomEvent(document, 'click', this.handleClickEvent.bind(this));
		this.registerEvent(this.app.workspace.on('editor-change', this.handleEditorChange.bind(this)));
	}

	private setupAPIs() {
		this.tasksApi = new Tasks(this.app, this);
		this.userObject = undefined;
		this.labelsApi = new Label(this.app, this);
		this.projectsApi = new Projects(this.app, this);
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
		this.addCommand({
			id: "vikunja-reset-tasks",
			name: "Reset vikunja instance, delete all tasks and labels",
			callback: async () => {
				await this.commands.resetTasksInVikunja();
			}
		})
		this.addCommand({
			id: "vikunja-reset-cache",
			name: "Reset cache and reindex tasks",
			callback: async () => {
				await this.cache.reindex();
			}
		})
		this.addCommand({
			id: "vikunja-dedup-labels",
			name: "Deduplicate labels in Vikunja",
			callback: async () => {
				await this.commands.deduplicateLabels();
			}
		})
	}

	private async handleEditorChange(data: any) {
		if (this.settings.debugging) console.log("Editor changed", data);
		const currentFile = this.app.workspace.getActiveFile();
		if (!currentFile) {
			if (this.settings.debugging) console.log("No file open");
			return;
		}

		const tasks = await this.processor.getVaultSearcher().getTasksFromFile(this.processor.getTaskParser(), currentFile);
		for (const task of tasks) {
			if (task.task.id) {
				const cachedTask = this.cache.get(task.task.id);
				if (cachedTask === undefined || !cachedTask.isTaskEqual(task.task)) {
					this.cache.update(task);
				} else {
					if (cachedTask.lineno !== task.lineno || cachedTask.filepath !== task.filepath) {
						this.cache.updateFileInfos(task.task.id, task.filepath, task.lineno);
					}
				}
			}
		}
		// FIXME the update line stuff should be communicated in settings
		return;
	}

	private async handleUpDownEvent(evt: KeyboardEvent) {
		if (evt.key === 'ArrowUp' || evt.key === 'ArrowDown' || evt.key === 'PageUp' || evt.key === 'PageDown' || evt.key === "Enter") {
			if (this.settings.debugging) console.log("Line changed via keys");
			await this.checkLastLineForUpdate();
		}
	}

	private async handleClickEvent(evt: MouseEvent) {
		if (!this.settings.updateCompletedStatusImmediately) {
			return;
		}

		const target = evt.target as HTMLInputElement;
		if (target.type === "checkbox") {
			const taskElement = target.closest("div");
			if (!taskElement) {
				if (this.settings.debugging) console.log("No task element found for checkbox");
				return;
			}

			if (this.settings.debugging) console.log("Task element found for checkbox",);
			const regex = /\svikunja_id(\d+)\s*/; // this ugly stuff is needed, because textContent remove all markdown related stuff
			const match = taskElement.textContent?.match(regex) || false;
			if (match) {
				const taskId = parseInt(match[1]);
				const cachedTask = this.cache.get(taskId);
				if (cachedTask === undefined || cachedTask.task.id === undefined) {
					if (this.settings.debugging) console.log("No task or task id found in task");
					return;
				}

				let status = false;
				switch (target.dataset.task) {
					case "x": {
						status = true;
						break;
					}
					case " ": {
						status = false;
						break;
					}
					default:
						throw new Error("Unknown task status");
				}
				if (this.settings.debugging) console.log("Checkbox clicked", status, target.dataset.task, target);
				// We are too fast, so this status shows the status BEFORE the click.
				cachedTask.task.done = !status;
				await this.tasksApi.updateTask(cachedTask);
			}
		} else {
			if (this.settings.debugging) console.log("No task id found for checkbox");
		}
	}
}

