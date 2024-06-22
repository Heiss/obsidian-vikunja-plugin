import {Notice, Plugin} from 'obsidian';
import {DEFAULT_SETTINGS, SettingTab, VikunjaPluginSettings} from "./src/settings/SettingTab";
import {MainModal} from "./src/modals/mainModal";
import {Tasks} from "./src/vikunja/tasks";
import {Processor} from "./src/processing/processor";
import {UserUser} from "./vikunja_sdk";
import {backendToFindTasks, chooseOutputFile} from "./src/enums";
import {appHasDailyNotesPluginLoaded} from "obsidian-daily-notes-interface";
import {getAPI} from "obsidian-dataview";
import {Label} from "./src/vikunja/labels";

// Remember to rename these classes and interfaces!

export default class VikunjaPlugin extends Plugin {
	settings: VikunjaPluginSettings;
	tasksApi: Tasks;
	userObject: UserUser | undefined;
	foundProblem = false;
	labelsApi: Label;
	processor: Processor;

	async onload() {
		await this.loadSettings();
		this.checkDependencies();

		this.tasksApi = new Tasks(this.app, this);
		this.userObject = undefined;
		this.labelsApi = new Label(this.app, this);

		this.setupObsidian();
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	private setupObsidian() {
		this.processor = new Processor(this.app, this);

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (_evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('This is a notice!');
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-sample-modal-simple',
			name: 'Open sample modal (simple)',
			callback: () => {
				new MainModal(this.app).open();
			}
		});

		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'vikunja-execute-sync-command',
			name: 'Trigger sync with Vikunja',
			callback: async () => {
				await this.processor.exec();
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

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

	checkDependencies() {
		if (this.settings.chooseOutputFile === chooseOutputFile.DailyNote && appHasDailyNotesPluginLoaded()) {
			new Notice("Vikunja Plugin: Daily notes core plugin is not loaded. So we cannot create daily note. Please install daily notes core plugin to use Daily Note.")
			if (this.settings.debugging) console.log("Vikunja Plugin: Daily notes core plugin is not loaded. So we cannot create daily note. Please install daily notes core plugin to use Daily Note.");
			this.foundProblem = true;
		}

		if (this.settings.chooseOutputFile === chooseOutputFile.File) {
			if (this.settings.chosenOutputFile === "") {
				new Notice("Vikunja Plugin: Output file is not selected. Please select a file to use File as output.");
				if (this.settings.debugging) console.log("Vikunja Plugin: Output file is not selected. Please select a file to use File as output.");
				this.foundProblem = true;
			}
			if (this.app.vault.getAbstractFileByPath(this.settings.chosenOutputFile) === null) {
				new Notice("Vikunja Plugin: Output file not found. Please select a valid file to use File as output.");
				if (this.settings.debugging) console.log("Vikunja Plugin: Output file not found. Please select a valid file to use File as output.");
				this.foundProblem = true;
			}
		}

		if (this.settings.backendToFindTasks === backendToFindTasks.Dataview && getAPI(this.app) === undefined) {
			new Notice("Vikunja Plugin: Obsidian Dataview plugin is not loaded. Please install Obsidian Dataview plugin to use Dataview.");
			if (this.settings.debugging) console.log("Vikunja Plugin: Obsidian Dataview plugin is not loaded. Please install Obsidian Dataview plugin to use Dataview.");
			this.foundProblem = true;
		}

		if (this.foundProblem) {
			new Notice(
				"Vikunja Plugin: Found problems. Please fix them in settings before using the plugin."
			);
		}
	}
}

