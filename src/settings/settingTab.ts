import {App, Notice, PluginSettingTab, Setting} from "obsidian";
import VikunjaPlugin from "../../main";
import {Projects} from "../vikunja/projects";
import {backendToFindTasks, chooseOutputFile, supportedTasksPluginsFormat} from "../enums";
import {ModelsProject} from "../../vikunja_sdk";
import {appHasDailyNotesPluginLoaded} from "obsidian-daily-notes-interface";

export interface VikunjaPluginSettings {
	mySetting: string;
	vikunjaAccessToken: string,
	vikunjaHost: string,
	useTasksFormat: supportedTasksPluginsFormat,
	chooseOutputFile: chooseOutputFile,
	chosenOutputFile: string,
	appendMode: boolean,
	insertAfter: string,
	defaultVikunjaProject: number,
	useTagsInText: boolean,
	useTagsInTextExceptions: string[],
	backendToFindTasks: backendToFindTasks,
	debugging: boolean,
	removeLabelsIfInVaultNotUsed: boolean,
	removeTasksIfInVaultNotFound: boolean,
	removeTasksOnlyInDefaultProject: boolean,
	enableCron: boolean,
	cronInterval: number,
	updateOnStartup: boolean,
	updateOnCursorMovement: boolean
}

export const DEFAULT_SETTINGS: VikunjaPluginSettings = {
	mySetting: 'default',
	vikunjaAccessToken: "ABXYZ",
	vikunjaHost: "https://try.vikunja.io/api/v1",
	useTasksFormat: supportedTasksPluginsFormat.Emoji,
	chooseOutputFile: chooseOutputFile.DailyNote,
	chosenOutputFile: "",
	appendMode: true,
	insertAfter: "",
	defaultVikunjaProject: -1,
	useTagsInText: false,
	useTagsInTextExceptions: [],
	backendToFindTasks: backendToFindTasks.Dataview,
	debugging: false,
	removeLabelsIfInVaultNotUsed: false,
	removeTasksIfInVaultNotFound: false,
	removeTasksOnlyInDefaultProject: true,
	enableCron: false,
	cronInterval: 500,
	updateOnStartup: false,
	updateOnCursorMovement: false
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

		new Setting(containerEl)
			.setName("Debugging")
			.setDesc("Enable debugging in console logs. Useful for troubleshooting and development.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.debugging)
				.onChange(async (value: boolean) => {
					this.plugin.settings.debugging = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Check for dependencies")
			.setDesc("Check if all dependencies are installed and if it can works correctly with your current settings to communicate with Vikunja. If there is only one Notice, everything is fine. If there are more, please enable debugging and check the console for more information.")
			.addButton(button => button
				.setButtonText("Check")
				.onClick(async () => {
					this.plugin.commands.checkDependencies();
					new Notice("Check for dependencies done.");
				})
			);


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

		new Setting(containerEl)
			.setName("Enable Cron")
			.setDesc("Enable the cron job to sync tasks automatically. If disabled, you have to trigger the sync manually via command.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableCron)
				.onChange(async (value: boolean) => {
					this.plugin.settings.enableCron = value;
					await this.plugin.saveSettings();
					this.display();
				}));

		if (this.plugin.settings.enableCron) {
			const cronIntervalText = "Set the interval in milliseconds for the cron job. Lower values will result in more frequent syncs, but may cause performance issues or can trigger any network bans.";
			const cronIntervalDescError = document.createDocumentFragment();
			cronIntervalDescError.append(cronIntervalText);
			cronIntervalDescError.append(document.createElement("br"));
			cronIntervalDescError.append(cronIntervalDescError.createEl("span", {
				cls: "error_text",
				text: "Cron interval must be a number and greater or equal than 20s."
			}));

			const cronIntervalEl = new Setting(containerEl)
				.setName("Cron interval")
				.setDesc(cronIntervalText)
				.addText(text => text
					.setValue(this.plugin.settings.cronInterval.toString())
					.setPlaceholder("300")
					.onChange(async (value: string) => {
							const parsed = parseInt(value);
							if (isNaN(parsed) || parsed < 20) {
								if (this.plugin.settings.debugging) console.log("Cron interval must be a number and greater or equal than 20. Got", value, parsed);
								cronIntervalEl.setDesc(cronIntervalDescError.cloneNode(true) as DocumentFragment);
								return;
							}

							cronIntervalEl.setDesc(cronIntervalText);

							this.plugin.settings.cronInterval = parseInt(value);
							await this.plugin.saveSettings();
						}
					))
			;
		}

		new Setting(containerEl).setHeading().setName('Vikunja Settings').setDesc('Settings to connect to Vikunja.');

		const hostDesc = document.createDocumentFragment();
		hostDesc.append("Set your Vikunja Host.");
		hostDesc.append(document.createElement("br"));
		hostDesc.append("Leave out the trailing slash. Valid examples: https://try.vikunja.io");

		new Setting(containerEl).setName("Host")
			.setDesc(hostDesc)
			.addText(text => text
				.setValue(this.plugin.settings.vikunjaHost)
				.onChange(async (value: string) => {
					if (value.endsWith("/api/v1")) {
						new Notice("Host must not end with /api/v1");
						return;
					}
					if (!value.startsWith("http")) {
						new Notice("Host must start with http:// or https://");
						return;
					}
					if (value.endsWith("/")) {
						new Notice("Host must not end with /");
						return;
					}

					this.plugin.settings.vikunjaHost = value;
					await this.plugin.saveSettings();
					this.plugin.tasksApi.init();
				}));

		new Setting(containerEl)
			.setName("Access token")
			.setDesc("Set your Vikunja Access token")
			.addText(text => text
				.setValue(this.plugin.settings.vikunjaAccessToken)
				.onChange(async (value: string) => {
					this.plugin.settings.vikunjaAccessToken = value;
					await this.plugin.saveSettings();
					this.plugin.tasksApi.init();
					// TODO: Implement an event to reload API configurations
				}));

		new Setting(containerEl)
			.setName("Test connection")
			.addButton(button => button
				.setButtonText("Test")
				.onClick(async () => {
					button.setDisabled(true);
					try {
						const tasks = await this.plugin.tasksApi.getAllTasks();
						if (this.plugin.settings.debugging) {
							console.log(`SettingsTab: Got tasks:`, tasks);
						}
						new Notice("Connection OK! ✅");
						await this.loadApi();
					} catch (e) {
						console.error(e);
						new Notice("Connection Error! ❌");
					}
					// Reset text
					setInterval(() => {
						button.setButtonText("Test").setDisabled(false);
					}, 2000);
				}));


		new Setting(containerEl).setHeading().setName('Pull: Obsidian <- Vikunja').setDesc('');

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
					if (!appHasDailyNotesPluginLoaded()) {
						new Notice("Daily notes core plugin is not loaded. So we cannot create daily note. Please install daily notes core plugin. Interrupt now.");
						if (this.plugin.settings.debugging) console.log("Daily notes core plugin is not loaded. So we cannot create daily note. Please install daily notes core plugin. Interrupt now.");
						dropdown.setValue(this.plugin.settings.chooseOutputFile.toString());
						return;
					}

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
					.setValue(this.plugin.settings.appendMode)
					.onChange(async (value: boolean) => {
						this.plugin.settings.appendMode = value;
						await this.plugin.saveSettings();
						this.display();
					}));

			if (!this.plugin.settings.appendMode) {
				new Setting(containerEl)
					.setName("Insert after")
					.setDesc("Insert tasks after the given string. The plugin will search in current daily note for the string and insert tasks after it.")
					.addText(text => text
						.setValue(this.plugin.settings.insertAfter)
						.setPlaceholder("# Tasks for today")
						.onChange(async (value: string) => {
							this.plugin.settings.insertAfter = value;
							await this.plugin.saveSettings();
						}));
			}
		}
		if (this.plugin.settings.chooseOutputFile === chooseOutputFile.File) {
			const descText = "Select the file where the tasks will be placed.";

			const outputFileDescError = document.createDocumentFragment();
			outputFileDescError.append(descText);
			outputFileDescError.append(document.createElement("br"));
			outputFileDescError.append(outputFileDescError.createEl("span", {
				cls: "error_text",
				text: "Output file not found. Please select a valid file to use File as output."
			}));

			const outputFileEl = new Setting(containerEl)
				.setName("Output file")
				.setDesc(descText)
				.addText(text => text
					.setValue(this.plugin.settings.chosenOutputFile)
					.setPlaceholder("path/to/file.md")
					.onChange(async (value: string) => {
						if (this.app.vault.getAbstractFileByPath(value) === null) {
							if (this.plugin.settings.debugging) console.log("Output file not found. Please select a valid file to use File as output.");
							outputFileEl.setDesc(outputFileDescError.cloneNode(true) as DocumentFragment);
							return;
						}

						outputFileEl.setDesc(descText);

						this.plugin.settings.chosenOutputFile = value;
						await this.plugin.saveSettings();
					})
				);
		}


		new Setting(containerEl)
			.setHeading()
			.setName('Push: Obsidian -> Vikunja')
			.setDesc('');

		new Setting(containerEl)
			.setName("Use tags in text")
			.setDesc("Enable this to use tags in text. This will add tags to the task description instead of removing them. They will be used as tags nevertheless.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.useTagsInText)
				.onChange(async (value: boolean) => {
						this.plugin.settings.useTagsInText = value;
						await this.plugin.saveSettings();

						this.display();
					}
				));

		if (this.plugin.settings.useTagsInText) {
			new Setting(containerEl)
				.setName("Exceptions for tags in text")
				.setDesc("Add tags that should be ignored when using tags in text. Tags added here will not be converted to text when pushed to vikunja. Comma separated.")
				.addText(text => text
					.setValue(this.plugin.settings.useTagsInTextExceptions.join(", "))
					.setPlaceholder("#tag1, #tag2")
					.onChange(async (value: string) => {
						this.plugin.settings.useTagsInTextExceptions = value.split(",").map(tag => tag.trim());
						await this.plugin.saveSettings();
					}));
		}

		new Setting(containerEl)
			.setName("Remove labels if not used in vault")
			.setDesc("If labels not found in the vault, they will be deleted in Vikunja. Mostly, because you delete them. Very helpful, if you only create labels through Obsidian.")
			.addToggle(toggle =>
				toggle
					.setValue(this.plugin.settings.removeLabelsIfInVaultNotUsed)
					.onChange(async (value: boolean) => {
						this.plugin.settings.removeLabelsIfInVaultNotUsed = value;
						await this.plugin.saveSettings();
						this.display();
					}));

		new Setting(containerEl)
			.setName("Remove tasks if not found in vault")
			.setDesc("If IDs not found in the vault, they will be deleted in Vikunja. Mostly, because you delete them. Very helpful, if you only create tasks through Obsidian.")
			.addToggle(toggle =>
				toggle
					.setValue(this.plugin.settings.removeTasksIfInVaultNotFound)
					.onChange(async (value: boolean) => {
						this.plugin.settings.removeTasksIfInVaultNotFound = value;
						await this.plugin.saveSettings();
						this.display();
					}));

		if (this.plugin.settings.removeTasksIfInVaultNotFound) {
			new Setting(containerEl)
				.setName("Remove tasks only in default project")
				.setDesc("If enabled, only tasks in the default project will be removed when ID not found in Vault. Otherwise, all tasks will be removed nevertheless the configured project.")
				.addToggle(toggle =>
					toggle
						.setValue(this.plugin.settings.removeTasksOnlyInDefaultProject)
						.onChange(async (value: boolean) => {
							this.plugin.settings.removeTasksOnlyInDefaultProject = value;
							await this.plugin.saveSettings();
						}));
		}

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
						console.log(`SettingsTab: Got projects:`, this.projects);
					}

					for (const project of this.projects) {
						if (project.id === undefined || project.title === undefined) {
							throw new Error("Project id or title is undefined");
						}
						dropdown.addOption(project.id.toString(), project.title);
					}

					dropdown.setValue(this.plugin.settings.defaultVikunjaProject.toString());

					dropdown.onChange(async (value: string) => {
						this.plugin.settings.defaultVikunjaProject = parseInt(value);
						if (this.plugin.settings.debugging) console.log(`SettingsTab: Selected Vikunja project:`, this.plugin.settings.defaultVikunjaProject);
						await this.plugin.saveSettings();
					});
				}
			)
		new Setting(containerEl)
			.setName("Move all tasks to selected default project")
			.setDesc("This will move all tasks from Vault to the selected default project in Vikunja. This will not delete any tasks in Vikunja, but only move them to the selected project. This helps, if you make a wrong decision in the past. This does not create any tasks in Vikunja.")
			.addButton(button => button
				.setButtonText("Move all tasks")
				.onClick(async () => {
						await this.plugin.commands.moveAllTasksToDefaultProject();
					}
				));


		new Setting(containerEl)
			.setHeading()
			.setName("Updates: Obsidian <-> Vikunja")

		new Setting(containerEl)
			.setDesc("This plugin prioritizes changes in Obsidian over Vikunja. This means, that if you make changes in both systems, the changes in Obsidian will be used over the one in Vikunja. To prevent data loss, do not make any changes in your markdown files without Obsidian.");

		new Setting(containerEl)
			.setName("Check for updates on startup")
			.setDesc("This will check for changes in Vault and Vikunja and update the tasks vice versa, but prioritize the changes in Obsidian. Useful, if you want to use Vikunja, but do not make any changes directly on the markdown files while obsidian is closed.")
			.addToggle(toggle =>
				toggle
					.setValue(this.plugin.settings.updateOnStartup)
					.onChange(async (value: boolean) => {
						this.plugin.settings.updateOnStartup = value;
						await this.plugin.saveSettings();
					}));

		new Setting(containerEl)
			.setName("Check for updates on cursor movement")
			.setDesc("This will check for changes only on cursors last line in Vault. Useful, if you want to reduce the load on your system and faster updates.")
			.addToggle(toggle =>
				toggle
					.setValue(this.plugin.settings.updateOnCursorMovement)
					.onChange(async (value: boolean) => {
						this.plugin.settings.updateOnCursorMovement = value;
						await this.plugin.saveSettings();
					}));

	}


	async loadApi() {
		this.projects = await this.projectsApi.getAllProjects();

		// Set default project if not set
		if (this.projects.length > 0 && this.plugin.settings.defaultVikunjaProject === null && this.projects[0] !== undefined && this.projects[0].id !== undefined) {
			this.plugin.settings.defaultVikunjaProject = this.projects[0].id;
		}
		if (this.plugin.settings.debugging) console.log(`SettingsTab: Default project set to:`, this.projects[0].id);

		this.display();
	}
}
