import {App, Notice, PluginSettingTab, Setting} from "obsidian";
import VikunjaPlugin from "../../main";
import {backendToFindTasks, chooseOutputFile, supportedTasksPluginsFormat} from "../enums";
import {ModelsProject, ModelsProjectView} from "../../vikunja_sdk";
import {appHasDailyNotesPluginLoaded} from "obsidian-daily-notes-interface";
import {PluginTask} from "../vaultSearcher/vaultSearcher";

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
	removeTasks: boolean,
	removeTasksOnlyInDefaultProject: boolean,
	enableCron: boolean,
	cronInterval: number,
	updateOnStartup: boolean,
	updateOnCursorMovement: boolean,
	createTaskOnCursorMovement: boolean,
	pullTasksOnlyFromDefaultProject: boolean,
	availableViews: ModelsProjectView[],
	selectedView: number,
	selectBucketForDoneTasks: number,
	cache: PluginTask[], // do not touch! Only via settings/VaultTaskCache.ts
	saveCacheToDiskImmediately: boolean,
	saveCacheToDiskFrequency: number,
	updateCompletedStatusImmediately: boolean,
	addLinkToFileInDescription: boolean,
}

export const DEFAULT_SETTINGS: VikunjaPluginSettings = {
	mySetting: 'default',
	vikunjaAccessToken: "ABXYZ",
	vikunjaHost: "https://try.vikunja.io",
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
	removeTasks: false,
	removeTasksOnlyInDefaultProject: true,
	enableCron: false,
	cronInterval: 500,
	updateOnStartup: false,
	updateOnCursorMovement: false,
	createTaskOnCursorMovement: false,
	pullTasksOnlyFromDefaultProject: false,
	availableViews: [],
	selectedView: 0,
	selectBucketForDoneTasks: 0,
	cache: [],
	saveCacheToDiskImmediately: true,
	saveCacheToDiskFrequency: 1,
	updateCompletedStatusImmediately: false,
	addLinkToFileInDescription: false,
}

export class MainSetting extends PluginSettingTab {
	plugin: VikunjaPlugin;
	projects: ModelsProject[] = [];
	private cacheListener: number;
	private cronListener: number;

	constructor(app: App, plugin: VikunjaPlugin) {
		super(app, plugin);
		this.plugin = plugin;

		if (!this.plugin.settings.saveCacheToDiskImmediately) {
			this.startCacheListener();
		}
		this.startCronListener();
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
					this.startCronListener();
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
							this.startCronListener();
						}
					));
		}

		new Setting(containerEl)
			.setName("Update cache to disk immediately")
			.setDesc("If enabled, the cache will be written to disk immediately after a change. If disabled, the cache will be written to disk after a certain interval. If you experience performance issues, you should disable this and use a frequency.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.saveCacheToDiskImmediately)
				.onChange(async (value: boolean) => {
					this.plugin.settings.saveCacheToDiskImmediately = value;
					await this.plugin.saveSettings();
					if (value) {
						clearInterval(this.cacheListener);
					} else {
						this.startCacheListener();
					}
					this.display();
				}));

		if (!this.plugin.settings.saveCacheToDiskImmediately) {
			new Setting(containerEl)
				.setName("Save cache to disk frequency")
				.setDesc("This plugin uses a cache to calculate correct dates. Set the interval in minutes to save the cache to disk. Lower values will result in more frequent saves, but may cause performance issues. Set too high, task dates are not correctly calculated, because they are missing in cache in next startup. If you make bulk edits of tasks in your vault, you should set higher value. Cache will be only written, if changes were made since last check. If you are unsure, try lowest value and increase it, if you experience performance issues. Limits are 1 to 60 minutes.")
				.addText(text => text
					.setValue(this.plugin.settings.saveCacheToDiskFrequency.toString())
					.onChange(async (value: string) => {
							const parsedNumber = parseInt(value);
							if (Number.isNaN(parsedNumber)) {
								return;
							}
							const lowerThanMax = Math.min(parsedNumber, 60);
							if (this.plugin.settings.debugging) console.log("Save cache to disk frequency - high limits", lowerThanMax);
							const higherThanMin = Math.max(lowerThanMax, 1);
							if (this.plugin.settings.debugging) console.log("Save cache to disk frequency - low limits", higherThanMin);
							this.plugin.settings.saveCacheToDiskFrequency = higherThanMin;
							await this.plugin.saveSettings();
							this.startCacheListener();
						}
					)
				)
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
					this.resetApis();
				}));

		new Setting(containerEl)
			.setName("Access token")
			.setDesc("Set your Vikunja Access token")
			.addText(text => text
				.setValue(this.plugin.settings.vikunjaAccessToken)
				.onChange(async (value: string) => {
					this.plugin.settings.vikunjaAccessToken = value;
					await this.plugin.saveSettings();
					this.resetApis();
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

						this.plugin.settings.availableViews = await this.plugin.projectsApi.getViewsByProjectId(this.plugin.settings.defaultVikunjaProject);
						if (this.plugin.settings.debugging) console.log(`SettingsTab: Available views:`, this.plugin.settings.availableViews);

						if (this.plugin.settings.availableViews.length === 1) {
							const id = this.plugin.settings.availableViews[0].id;
							if (id === undefined) throw new Error("View id is undefined");
							this.plugin.settings.selectedView = id;
							this.plugin.settings.selectBucketForDoneTasks = await this.plugin.projectsApi.getDoneBucketIdFromKanbanView(this.plugin.settings.defaultVikunjaProject);
							if (this.plugin.settings.debugging) console.log(`SettingsTab: Done bucket set to:`, this.plugin.settings.selectBucketForDoneTasks);
						}
						await this.plugin.saveSettings();
						this.display();
					});
				}
			)

		if (this.plugin.settings.availableViews.length > 1) {
			new Setting(containerEl)
				.setName("Select bucket")
				.setDesc("Because vikunja does not move done tasks to the correct bucket, you have to select the bucket where the done tasks are placed, so this plugin can do it for you.")
				.addDropdown(dropdown => {
					let i = 0;
					for (const view of this.plugin.settings.availableViews) {
						if (view.id === undefined || view.title === undefined) {
							throw new Error("View id or title is undefined");
						}
						dropdown.addOption((i++).toString(), view.title);
					}

					dropdown.setValue(this.plugin.settings.selectedView.toString());

					dropdown.onChange(async (value: string) => {
						this.plugin.settings.selectedView = parseInt(value);
						if (this.plugin.settings.debugging) console.log(`SettingsTab: Selected Vikunja bucket:`, this.plugin.settings.selectedView);

						this.plugin.settings.selectBucketForDoneTasks = await this.plugin.projectsApi.getDoneBucketIdFromKanbanView(this.plugin.settings.defaultVikunjaProject);
						if (this.plugin.settings.debugging) console.log(`SettingsTab: Done bucket set to:`, this.plugin.settings.selectBucketForDoneTasks);
						await this.plugin.saveSettings();
					});
				});
		}

		new Setting(containerEl)
			.setName("Move all tasks to selected default project")
			.setDesc("This will move all tasks from Vault to the selected default project in Vikunja. This will not delete any tasks in Vikunja, but only move them to the selected project. This helps, if you make a wrong decision in the past. This does not create any tasks in Vikunja.")
			.addButton(button => button
				.setButtonText("Move all tasks")
				.onClick(async () => {
						await this.plugin.commands.moveAllTasksToDefaultProject();
					}
				));

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
			.setName("Pull tasks only from default project")
			.setDesc("If enabled, only tasks from the default project will be pulled from Vikunja. Useful, if you use Vikunja with several apps or different projects and Obsidian is only one of them. Beware: If you select that labels should be deleted in vikunja, if not found in vault, this will sync all labels regardless of projects.")
			.addToggle(toggle =>
				toggle
					.setValue(this.plugin.settings.pullTasksOnlyFromDefaultProject)
					.onChange(async (value: boolean) => {
						this.plugin.settings.pullTasksOnlyFromDefaultProject = value;
						await this.plugin.saveSettings();
					}));


		new Setting(containerEl)
			.setHeading()
			.setName('Push: Obsidian -> Vikunja')
			.setDesc('');

		const linkDesc = document.createDocumentFragment();
		linkDesc.append("Add a link to the file in the task description. This will help you to find the file, where the task is created. Beware: This is currently not supported by Vikunja, but it is implemented already. Follow ",
			linkDesc.createEl("a", {
				href: "https://github.com/go-vikunja/vikunja/issues/306",
				text: "github issue",
			}), " for more information.");

		new Setting(containerEl)
			.setName("Add link to file in description")
			.setDesc(linkDesc)
			.addToggle(toggle => {
				return toggle
					.setValue(this.plugin.settings.addLinkToFileInDescription)
					.onChange(async (value: boolean) => {
						this.plugin.settings.addLinkToFileInDescription = value;
						await this.plugin.saveSettings();
					});
			});

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
			.setDesc("If tasks not found in the vault, they will be deleted in Vikunja. Mostly, because you delete them. Very helpful, if you only create tasks through Obsidian.")
			.addToggle(toggle =>
				toggle
					.setValue(this.plugin.settings.removeTasks)
					.onChange(async (value: boolean) => {
						this.plugin.settings.removeTasks = value;
						await this.plugin.saveSettings();
						this.display();
					}));

		if (this.plugin.settings.removeTasks) {

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
			new Setting(containerEl)
				.setName("Loading projects...")
				.setDesc("Please wait until the projects are loaded. If this message still there after a few seconds, please check your Vikunja Host and Access Token. Enable debugging and check the console for more information.");
			this.loadApi().then(_r => {
			});
			return;
		}

		new Setting(containerEl)
			.setName("Check for changes on cursor movement")
			.setDesc("This will check for changes on cursors last line in Vault, too. Useful, if you want to reduce the load on your system and faster updates.")
			.addToggle(toggle =>
				toggle
					.setValue(this.plugin.settings.updateOnCursorMovement)
					.onChange(async (value: boolean) => {
						this.plugin.settings.updateOnCursorMovement = value;
						await this.plugin.saveSettings();
						this.display();
					}));

		if (this.plugin.settings.updateOnCursorMovement) {
			new Setting(containerEl)
				.setName("Create task on cursor movement")
				.setDesc("This will create a task in Vikunja, if you move the cursor and the found task on last line was not synced to Vikunja. Useful, if you want to create a task quickly and do not want to sync manually.")
				.addToggle(toggle =>
					toggle
						.setValue(this.plugin.settings.createTaskOnCursorMovement)
						.onChange(async (value: boolean) => {
								this.plugin.settings.createTaskOnCursorMovement = value;
								await this.plugin.saveSettings();
							}
						));
		}

		new Setting(containerEl)
			.setName("Update completed status immediately")
			.setDesc("This will update the completed status of tasks immediately to Vikunja.")
			.addToggle(toggle =>
				toggle
					.setValue(this.plugin.settings.updateCompletedStatusImmediately)
					.onChange(async (value: boolean) => {
						this.plugin.settings.updateCompletedStatusImmediately = value;
						await this.plugin.saveSettings();
					}));


	}

	async loadApi() {
		this.projects = await this.plugin.projectsApi.getAllProjects();

		// Set default project if not set
		if (this.projects.length > 0 && this.plugin.settings.defaultVikunjaProject === null && this.projects[0] !== undefined && this.projects[0].id !== undefined) {
			this.plugin.settings.defaultVikunjaProject = this.projects[0].id;
		}
		if (this.plugin.settings.debugging) console.log(`SettingsTab: Default project set to:`, this.projects[0].id);

		this.display();
	}

	private startCacheListener() {
		if (this.plugin.settings.debugging) console.log("SettingsTab: Start cache listener");
		window.clearInterval(this.cacheListener);
		this.cacheListener = window.setInterval(async () => {
			await this.plugin.cache.saveCacheToDisk()
		}, this.plugin.settings.saveCacheToDiskFrequency * 60 * 1000);
		this.plugin.registerInterval(this.cacheListener);
	}

	private startCronListener() {
		if (this.plugin.settings.debugging) console.log("SettingsTab: Start cron listener");
		window.clearInterval(this.cronListener);
		this.cronListener = window
			.setInterval(async () => {
					// this runs anyway, also when cron not enabled, to be dynamically enabled by settings without disable/enable plugin
					if (this.plugin.settings.enableCron) {
						await this.plugin.processor.exec()
					}
				},
				this.plugin.settings.cronInterval * 1000)
		this.plugin.registerInterval(this.cronListener);
	}

	private resetApis() {
		// TODO: Implement an event to reload API configurations
		this.plugin.tasksApi.init();
		this.plugin.projectsApi.init();
		this.plugin.labelsApi.init();
	}
}
