import {App} from "obsidian";
import VikunjaPlugin from "../../main";
import {Configuration, ModelsTask, ProjectApi} from "../../vikunja_sdk";

class Projects {
	plugin: VikunjaPlugin;
	projectsApi: ProjectApi;

	constructor(app: App, plugin: VikunjaPlugin) {
		this.plugin = plugin;
		this.init();
	}

	init() {
		const configuration = new Configuration({
			basePath: this.plugin.settings.vikunjaHost + "/api/v1",
			apiKey: "Bearer " + this.plugin.settings.vikunjaAccessToken,
		});
		this.projectsApi = new ProjectApi(configuration);
	}

	async getAllProjects(): Promise<ModelsTask[]> {
		return this.projectsApi.projectsGet();
	}

	async getProjectById(id: number): Promise<ModelsTask> {
		return this.projectsApi.projectsIdGet({id: id});
	}
}

export {Projects};
