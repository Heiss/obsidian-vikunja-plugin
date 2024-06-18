import {Notice, Plugin} from 'obsidian';
import {DEFAULT_SETTINGS, SettingTab, VikunjaPluginSettings} from "./src/settings/SettingTab";
import {MainModal} from "./src/modals/mainModal";
import {Tasks} from "./src/vikunja/tasks";
import {Processor} from "./src/processing/processor";

// Remember to rename these classes and interfaces!

export default class VikunjaPlugin extends Plugin {
	settings: VikunjaPluginSettings;
	vikunjaTasksApi: Tasks;
	processor: Processor;

	async onload() {
		await this.loadSettings();
		this.vikunjaTasksApi = new Tasks(this.app, this);
		this.processor = new Processor(this.app, this);

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
		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt: MouseEvent) => {
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
			callback: () => {
				this.processor.exec();
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
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}
}

