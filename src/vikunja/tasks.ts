import {App} from "obsidian";
import VikunjaPlugin from "../../main";
import {
	Configuration,
	ModelsTask,
	ProjectsIdTasksPutRequest,
	TaskApi,
	TasksIdDeleteRequest,
	TasksIdPostRequest,
	TasksTaskLabelsLabelDeleteRequest,
	TasksTaskLabelsPutRequest
} from "../../vikunja_sdk";

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
		return await this.tasksApi.tasksAllGet();
	}

	async updateTask(task: ModelsTask): Promise<ModelsTask> {
		if (!task.id) throw new Error("TasksApi: Task id is not defined");
		const param: TasksIdPostRequest = {id: task.id, task: task};
		await this.updateLabelsInVikunja(task);
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
		const createdTask = await this.tasksApi.projectsIdTasksPut(param);
		createdTask.labels = task.labels;
		await this.addLabelToTask(createdTask);
		return createdTask;
	}

	async createTasks(tasks: ModelsTask[]): Promise<ModelsTask[]> {
		return Promise.all(tasks.map(task => this.createTask(task)));
	}

	async deleteTask(task: ModelsTask) {
		if (this.plugin.settings.debugging) console.log("TasksApi: Deleting task", task);
		if (!task.id) throw new Error("TasksApi: Task id is not defined");
		const param: TasksIdDeleteRequest = {id: task.id};
		return this.tasksApi.tasksIdDelete(param);
	}

	async deleteTasks(tasksToDeleteInVikunja: ModelsTask[]) {
		return Promise.all(tasksToDeleteInVikunja.map(task => this.deleteTask(task)));
	}

	async addLabelToTask(task: ModelsTask) {
		if (!task.id) throw new Error("TasksApi: Task id cannot be found");
		if (!task.labels) return;
		if (this.plugin.settings.debugging) console.log("TasksApi: Adding labels to task", task.id, task.labels);

		for (const label of task.labels) {
			if (!label.title) continue;

			let existingLabel = await this.plugin.labelsApi.findLabelByTitle(label.title);
			if (!existingLabel) {
				existingLabel = await this.plugin.labelsApi.createLabel(label);
			}
			if (!existingLabel.id) throw new Error("TasksApi: Label id cannot be defined");

			const param: TasksTaskLabelsPutRequest = {
				label: {labelId: existingLabel.id},
				task: task.id
			}

			await this.plugin.labelsApi.labelsApi.tasksTaskLabelsPut(param);
		}
	}

	async deleteLabelFromTask(task: ModelsTask) {
		if (!task.id) throw new Error("TasksApi: Task id cannot be found");
		const currentAssignedLabelsOfTask = await this.plugin.tasksApi.tasksApi.tasksIdGet({id: task.id});
		if (currentAssignedLabelsOfTask.labels === undefined) return;
		if (task.labels === undefined) throw new Error("Task labels are undefined");

		// @ts-ignore
		const labelsToDelete = currentAssignedLabelsOfTask.labels.filter(label => !task.labels.map(label => label.title).includes(label.title));
		if (this.plugin.settings.debugging) console.log("TasksApi: Deleting labels from task", task.id, labelsToDelete);

		for (const label of labelsToDelete) {
			if (!label.id) continue;
			const param: TasksTaskLabelsLabelDeleteRequest = {
				label: label.id,
				task: task.id
			}

			await this.plugin.labelsApi.labelsApi.tasksTaskLabelsLabelDelete(param);
		}
	}

	private async updateLabelsInVikunja(task: ModelsTask) {
		try {
			await this.addLabelToTask(task);
			await this.deleteLabelFromTask(task);
		} catch (error) {
			console.error("Error updating labels in Vikunja", error);
		}
	}
}

export {Tasks};
