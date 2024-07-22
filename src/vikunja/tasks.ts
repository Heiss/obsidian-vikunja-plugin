import {App} from "obsidian";
import VikunjaPlugin from "../../main";
import {
	Configuration,
	ModelsTask,
	ProjectsIdTasksPutRequest,
	TaskApi,
	TasksIdDeleteRequest,
	TasksIdGetRequest,
	TasksIdPostRequest,
	TasksTaskLabelsLabelDeleteRequest,
	TasksTaskLabelsPutRequest
} from "../../vikunja_sdk";
import VikunjaAPI from "./VikunjaAPI";

class Tasks implements VikunjaAPI {
	plugin: VikunjaPlugin;
	tasksApi: TaskApi;

	constructor(app: App, plugin: VikunjaPlugin) {
		this.plugin = plugin;
		this.init();
	}

	checkPermissions(): boolean {
		// TODO: Implement this method
		return true;
	}

	init() {
		const configuration = new Configuration({
			basePath: this.plugin.settings.vikunjaHost + "/api/v1",
			apiKey: "Bearer " + this.plugin.settings.vikunjaAccessToken,
		});
		this.tasksApi = new TaskApi(configuration);
	}

	async getAllTasks(): Promise<ModelsTask[]> {
		return await this.tasksApi.tasksAllGet();
	}

	async updateTask(task: ModelsTask): Promise<ModelsTask> {
		if (!task.id) throw new Error("TasksApi: Task id is not defined");
		if (this.plugin.settings.debugging) console.log("TasksApi: Updating task", task.id, task);
		if (task.done) {
			task.bucketId = this.plugin.settings.selectBucketForDoneTasks;
		}

		await this.addLabelToTask(task);

		const param: TasksIdPostRequest = {id: task.id, task: task};
		return this.tasksApi.tasksIdPost(param);
	}

	async updateTasks(tasks: ModelsTask[]): Promise<ModelsTask[]> {
		return Promise.all(tasks.map(task => this.updateTask(task)));
	}

	async createTask(task: ModelsTask): Promise<ModelsTask> {
		if (this.plugin.settings.debugging) console.log("TasksApi: Creating task", task);
		if (!task.projectId) throw new Error("TasksApi: Task projectId is not defined");

		// TODO add link to vault file in Vikunja task
		//  let url = encodeURI(`obsidian://open?vault=${this.app.vault.getName()}&file=${filepath}`)
		//  description =`[${filepath}](${url})`;
		//  filepath could be an issue, because this information is dropped right before calling this method right now
		//  Another problem is, that it cannot track moved tasks in the vault

		if (task.done) {
			task.bucketId = this.plugin.settings.selectBucketForDoneTasks;
		}

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
		if (!task.id) throw new Error("TasksApi: Task id is not defined");
		const taskId = task.id;
		if (this.plugin.settings.debugging) console.log("TasksApi: Deleting task", taskId);
		const param: TasksIdDeleteRequest = {id: taskId};
		try {
			const result = await this.tasksApi.tasksIdDelete(param);
			if (this.plugin.settings.debugging) console.log("TasksApi: Deleted task", taskId, result);
		} catch (error) {
			console.error("Error deleting task", error);
		}
	}

	async deleteTasks(tasksToDeleteInVikunja: ModelsTask[]) {
		return Promise.all(tasksToDeleteInVikunja.map(task => this.deleteTask(task)));
	}

	async addLabelToTask(task: ModelsTask) {
		if (!task.id) throw new Error("TasksApi: Task id cannot be found");
		if (!task.labels) return;
		if (this.plugin.settings.debugging) console.log("TasksApi: Adding labels to task", task.id, task.labels);

		for (const label of await this.plugin.labelsApi.getOrCreateLabels(task.labels)) {
			if (!label.title) continue;

			const param: TasksTaskLabelsPutRequest = {
				label: {labelId: label.id},
				task: task.id
			}

			try {
				if (this.plugin.settings.debugging) console.log("TasksApi: Adding label to task", param);
				await this.plugin.labelsApi.labelsApi.tasksTaskLabelsPut(param);
			} catch (error) {
				if (this.plugin.settings.debugging) console.error("Error adding label to task, mostly because it is already there", error);
			}
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

	async getTaskById(taskId: number) {
		const param: TasksIdGetRequest = {id: taskId};
		return this.tasksApi.tasksIdGet(param);
	}

	async updateProjectsIdInVikunja(tasks: ModelsTask[], projectId: number) {
		if (this.plugin.settings.debugging) console.log("TasksApi: Updating project id in tasks", projectId);
		// FIXME there is a bulkPost in tasksApi, use it instead of update any task separately
		return await Promise.all(tasks.map(task => this.updateProjectIdInVikunja(task, projectId)));
	}

	async updateProjectIdInVikunja(task: ModelsTask, projectId: number) {
		if (!task.id) throw new Error("TasksApi: Task id is not defined");
		if (this.plugin.settings.debugging) console.log("TasksApi: Updating project id in task", task.id, projectId);

		task.projectId = projectId;
		await this.updateTask(task);
	}

	async updateBucketInVikunja(task: ModelsTask, bucketId: number) {
		if (!task.id) throw new Error("TasksApi: Task id is not defined");
		if (this.plugin.settings.debugging) console.log("TasksApi: Updating bucket in task", task.id, bucketId);

	}
}

export {Tasks};
