import {App} from "obsidian";
import VikunjaPlugin from "../../main";
import {Configuration, ModelsTask, ProjectsIdTasksPutRequest, TaskApi, TasksIdPostRequest} from "../../vikunja_sdk";

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

	async updateTask(task: ModelsTask): Promise<ModelsTask> {
		if (!task.id) throw new Error("TasksApi: Task id is not defined");
		const param: TasksIdPostRequest = {id: task.id, task: task};
		return this.tasksApi.tasksIdPost(param);
	}

	async updateTasks(tasks: ModelsTask[]): Promise<ModelsTask[]> {
		return Promise.all(tasks.map(task => this.updateTask(task)));
	}

	async createTask(task: ModelsTask): Promise<ModelsTask> {
		if (this.plugin.settings.debugging) console.log("TasksApi: Creating task", task);
		if (!task.projectId) throw new Error("TasksApi: Task projectId is not defined");
		const param: ProjectsIdTasksPutRequest = {
			id: task.projectId,
			task: task
		};
		return this.tasksApi.projectsIdTasksPut(param);
	}

	async createTasks(tasks: ModelsTask[]): Promise<ModelsTask[]> {
		return Promise.all(tasks.map(task => this.createTask(task)));
	}
}

export {Tasks};
