import {App} from "obsidian";
import VikunjaPlugin from "../../main";
import {Configuration, ModelsTask, TaskApi, TasksIdPostRequest} from "../../vikunja_sdk";

class Tasks {
	plugin: VikunjaPlugin;
	tasksApi: TaskApi;

	constructor(app: App, plugin: VikunjaPlugin) {
		this.plugin = plugin;
		this.init();
	}

	init() {
		const configuration = new Configuration({
			basePath: this.plugin.settings.vikunjaHost,
			apiKey: "Bearer " + this.plugin.settings.vikunjaAccessToken,
		});
		this.tasksApi = new TaskApi(configuration);
	}

	async getAllTasks(): Promise<ModelsTask[]> {
		return this.tasksApi.tasksAllGet();
	}

	async setTask(task: ModelsTask): Promise<ModelsTask> {
		if (!task.id) throw new Error("Task id is not defined");
		const param: TasksIdPostRequest = {id: task.id, task: task};
		return this.tasksApi.tasksIdPost(param);
	}
}

export {Tasks};
