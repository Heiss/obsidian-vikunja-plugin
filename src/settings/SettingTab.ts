import {App, PluginSettingTab, Setting} from "obsidian";
import VikunjaPlugin from "../../main";
import {Projects} from "../vikunja/projects";
import {backendToFindTasks, chooseOutputFile, supportedTasksPluginsFormat} from "../enums";
import {ModelsProject} from "../../vikunja_sdk";

export interface VikunjaPluginSettings {
	mySetting: string;
	vikunjaAccessToken: string,
	vikunjaHost: string,
	useTasksFormat: supportedTasksPluginsFormat,
	chooseOutputFile: chooseOutputFile,
	dailyNoteAppendMode: boolean,
	dailyNoteInsertAfter: string,
	defaultVikunjaProject: number | undefined,
	useTagsInText: boolean,
	backendToFindTasks: backendToFindTasks,
	debugging: boolean,
}

export const DEFAULT_SETTINGS: VikunjaPluginSettings = {
	mySetting: 'default',
	vikunjaAccessToken: "ABXYZ",
	vikunjaHost: "https://try.vikunja.io/api/v1",
	useTasksFormat: supportedTasksPluginsFormat.Emoji,
	chooseOutputFile: chooseOutputFile.DailyNote,
	dailyNoteAppendMode: true,
	dailyNoteInsertAfter: "",
	defaultVikunjaProject: undefined,
	useTagsInText: false,
	backendToFindTasks: backendToFindTasks.Dataview,
	debugging: false,
}

export class SettingTab extends PluginSettingTab {
	plugin: VikunjaPlugin;
	projectsApi: Projects;
	projects: ModelsProject[] = [];

	constructor(app: App, plugin: VikunjaPlugin) {
		super(app, plugin);
		this.plugin = plugin;
		this.projectsApi = new Projects(app, plugin);
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl).setHeading().setName('Vikunja Settings').setDesc('Settings to connect to Vikunja.');

		const hostDesc = document.createDocumentFragment();
		hostDesc.append("Set your Vikunja Host.");
		hostDesc.append(document.createElement("br"));
		hostDesc.append("Leave out the trailing slash. Valid examples: https://try.vikunja.io/api/v1 or https://try.vikunja.io");

		new Setting(containerEl).setName("Host")
			.setDesc(hostDesc)
			.addText(text => text
				.setValue(this.plugin.settings.vikunjaHost)
				.onChange(async (value: string) => {
					if (!value.endsWith("/api/v1")) {
						value += "/api/v1";
					}

					this.plugin.settings.vikunjaHost = value;
					await this.plugin.saveSettings();
					this.plugin.vikunjaTasksApi.init();
				}));

		new Setting(containerEl)
			.setName("Access Token")
			.setDesc("Set your Vikunja Access Token")
			.addText(text => text
				.setValue(this.plugin.settings.vikunjaAccessToken)
				.onChange(async (value: string) => {
					this.plugin.settings.vikunjaAccessToken = value;
					await this.plugin.saveSettings();
					this.plugin.vikunjaTasksApi.init();
				}));

		new Setting(containerEl)
			.setName("Test connection")
			.addButton(button => button
				.setButtonText("Test")
				.onClick(async () => {
					button.setButtonText("Testing...").setDisabled(true);
					try {
						const tasks = await this.plugin.vikunjaTasksApi.getAllTasks();
						if (this.plugin.settings.debugging) {
							console.log(`Got tasks in settingsTab:`, tasks);
						}
						button.setButtonText("OK! ✅");
						this.loadApi().then(_r => {
						});
					} catch (e) {
						console.error(e);
						button.setButtonText("Error! ❌");
					}
					// Reset text
					setInterval(() => {
						button.setButtonText("Test").setDisabled(false);
					}, 2000);
				}));


		new Setting(containerEl).setHeading().setName('General settings').setDesc('');

		new Setting(containerEl)
			.setName("Debugging")
			.setDesc("Enable debugging in console logs. Useful for troubleshooting and development.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.debugging)
				.onChange(async (value: boolean) => {
					this.plugin.settings.debugging = value;
					await this.plugin.saveSettings();
				}));

		const pluginFormatDesc = document.createDocumentFragment();
		pluginFormatDesc.append("Select the format of the plugin you are using. This will change the way the plugin interacts with your vault, because it tries to get all information with the given format. Currently supported formats: ",
			pluginFormatDesc.createEl("a", {
				href: "https://publish.obsidian.md/tasks/Reference/Task+Formats/Tasks+Emoji+Format",
				text: "Tasks Emoji Format",
			}));

		new Setting(containerEl)
			.setName("Use tasks format")
			.setDesc(pluginFormatDesc)
			.addDropdown(dropdown => {
				let i = 0;
				for (const key in supportedTasksPluginsFormat) {
					// Skip if it's a number, because this is a default enum behavior for faster access...
					if (!isNaN(parseInt(key))) continue;
					dropdown.addOption((i++).toString(), key);
				}


				dropdown.setValue(this.plugin.settings.useTasksFormat?.toString());
				dropdown.onChange(async (value: string) => {
					this.plugin.settings.useTasksFormat = parseInt(value) as supportedTasksPluginsFormat;
					await this.plugin.saveSettings();
				});
			});

		const backendDesc = document.createDocumentFragment();
		backendDesc.append("Select the backend to find tasks. This will change the way the plugin interacts with your vault, because it tries to get all information with the given backend. Currently supported backends: ",
			backendDesc.createEl("a", {
				href: "https://blacksmithgu.github.io/obsidian-dataview/",
				text: "Dataview",
			}));
		new Setting(containerEl)
			.setName("Backend to find tasks")
			.setDesc(backendDesc)
			.addDropdown(dropdown => {
				let i = 0;
				for (const key in backendToFindTasks) {
					// Skip if it's a number, because this is a default enum behavior for faster access...
					if (!isNaN(parseInt(key))) continue;
					dropdown.addOption((i++).toString(), key);
				}

				dropdown.setValue(this.plugin.settings.backendToFindTasks?.toString());
				dropdown.onChange(async (value: string) => {
					this.plugin.settings.backendToFindTasks = parseInt(value) as backendToFindTasks;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl).setHeading().setName('Pull from Vikunja').setDesc('');

		const targetDesc = document.createDocumentFragment();
		targetDesc.append('This is the place where tasks from Vikunja will be placed. Currently supported plugins are: ', targetDesc.createEl("a", {
			href: "https://help.obsidian.md/Plugins/Daily+notes",
			text: "Daily Note",
		}));
		new Setting(containerEl)
			.setName("Pull tasks to file")
			.setDesc(targetDesc)
			.addDropdown(dropdown => {
				let i = 0;
				for (const key in chooseOutputFile) {
					// Skip if it's a number, because this is a default enum behavior for faster access...
					if (!isNaN(parseInt(key))) continue;
					dropdown.addOption((i++).toString(), key);
				}

				dropdown.setValue(this.plugin.settings.chooseOutputFile?.toString());
				dropdown.onChange(async (value: string) => {
					this.plugin.settings.chooseOutputFile = parseInt(value) as chooseOutputFile;
					await this.plugin.saveSettings();
					this.display();
				});
			})

		if (this.plugin.settings.chooseOutputFile === chooseOutputFile.DailyNote) {
			new Setting(containerEl)
				.setName("Append mode")
				.setDesc("Append tasks to the daily note at the bottom.")
				.addToggle(toggle => toggle
					.setValue(this.plugin.settings.dailyNoteAppendMode)
					.onChange(async (value: boolean) => {
						this.plugin.settings.dailyNoteAppendMode = value;
						await this.plugin.saveSettings();
						this.display();
					}));

			if (!this.plugin.settings.dailyNoteAppendMode) {
				new Setting(containerEl)
					.setName("Insert after")
					.setDesc("Insert tasks after the given string. The plugin will search in current daily note for the string and insert tasks after it.")
					.addText(text => text
						.setValue(this.plugin.settings.dailyNoteInsertAfter)
						.setPlaceholder("# Tasks for today")
						.onChange(async (value: string) => {
							this.plugin.settings.dailyNoteInsertAfter = value;
							await this.plugin.saveSettings();
						}));
			}
		}


		new Setting(containerEl).setHeading().setName('Push to Vikunja').setDesc('');

		new Setting(containerEl)
			.setName("Use tags in text")
			.setDesc("Enable this to use tags in text. This will add tags to the task description instead of removing them. They will be used as tags nevertheless.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.useTagsInText)
				.onChange(async (value: boolean) => {
					this.plugin.settings.useTagsInText = value;
					await this.plugin.saveSettings();
				}));
		if (this.projects.length === 0) {
			new Setting(containerEl).setName("Loading projects...").setDesc("Please wait until the projects are loaded. If this message still there after a few seconds, please check your Vikunja Host and Access Token. Enable debugging and check the console for more information.");
			this.loadApi().then(_r => {
			});
			return;
		}

		new Setting(containerEl)
			.setName("Select default project")
			.setDesc("This project will be used to place new tasks created by this plugin.")
			.addDropdown(async dropdown => {
					if (this.plugin.settings.debugging) {
						console.log(`Got projects in settingsTab:`, this.projects);
					}

					for (const project of this.projects) {
						if (project.id === undefined || project.title === undefined) {
							throw new Error("Project id or title is undefined");
						}
						dropdown.addOption(project.id.toString(), project.title);
					}

					dropdown.setValue(this.plugin.settings.defaultVikunjaProject?.toString() || "");

					dropdown.onChange(async (value: string) => {
						this.plugin.settings.defaultVikunjaProject = parseInt(value);
						await this.plugin.saveSettings();
					});
				}
			)
	}

	async loadApi() {
		this.projects = await this.projectsApi.getAllProjects();
		this.display();
	}
}
