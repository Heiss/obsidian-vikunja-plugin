import {App} from "obsidian";
import VikunjaPlugin from "../../main";
import {
	Configuration,
	ModelsTask,
	ProjectsIdTasksPutRequest,
	TaskApi,
	TasksAllGetRequest,
	TasksIdDeleteRequest,
	TasksIdGetRequest,
	TasksIdPostRequest,
	TasksTaskLabelsLabelDeleteRequest,
	TasksTaskLabelsPutRequest
} from "../../vikunja_sdk";
import VikunjaAPI from "./VikunjaAPI";
import {PluginTask} from "../vaultSearcher/vaultSearcher";

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
		const params: TasksAllGetRequest = {page: 0};
		return await this.tasksApi.tasksAllGet(params);
	}

	async getTasksForPage(page: number): Promise<ModelsTask[]> {
		const params: TasksAllGetRequest = {
			page: page
		};
		return await this.tasksApi.tasksAllGet(params);
	}

	async updateTask(task: PluginTask): Promise<ModelsTask> {
		const id = task.task.id;
		if (id === undefined) {
			throw new Error("TasksApi: Task id is not defined");
		}
		if (this.plugin.settings.debugging) console.log("TasksApi: Updating task", task.task.id, task);
		task = this.generateDescriptionLink(task);

		await this.addLabelToTask(task.task);
		const param: TasksIdPostRequest = {
			id: id,
			task: this.getCleanedModelTask(task.task)
		};
		const vikunjaTask = await this.tasksApi.tasksIdPost(param);
		task.task = vikunjaTask;
		this.plugin.cache.update(task);
		return vikunjaTask;
	}

	async createTask(task: PluginTask): Promise<ModelsTask> {
		if (this.plugin.settings.debugging) console.log("TasksApi: Creating task", task);
		const id = task.task.projectId;
		if (id === undefined) throw new Error("TasksApi: Project id is not defined");

		if (task.task.done) {
			task.task.bucketId = this.plugin.settings.selectBucketForDoneTasks;
		}
		task = this.generateDescriptionLink(task);

		const param: ProjectsIdTasksPutRequest = {
			id: id,
			task: task.task
		};
		const createdTask = await this.tasksApi.projectsIdTasksPut(param);
		createdTask.labels = task.task.labels;
		await this.addLabelToTask(createdTask);
		return createdTask;
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
		this.plugin.cache.delete(taskId);
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

	async getTaskById(taskId: number): Promise<ModelsTask> {
		const param: TasksIdGetRequest = {id: taskId};
		return await this.tasksApi.tasksIdGet(param);
	}

	async updateProjectsIdInVikunja(tasks: PluginTask[], projectId: number) {
		if (this.plugin.settings.debugging) console.log("TasksApi: Updating project id in tasks", projectId);
		// FIXME there is a bulkPost in tasksApi, use it instead of update any task separately
		return await Promise.all(tasks.map(task => this.updateProjectIdInVikunja(task, projectId)));
	}

	async updateProjectIdInVikunja(task: PluginTask, projectId: number) {
		if (!task.task.id) throw new Error("TasksApi: Task id is not defined");
		if (this.plugin.settings.debugging) console.log("TasksApi: Updating project id in task", task.task.id, projectId);

		task.task.projectId = projectId;
		await this.updateTask(task);
	}

	private generateDescriptionLink(task: PluginTask): PluginTask {
		if (!this.plugin.settings.addLinkToFileInDescription) return task;

		const newTask = task;
		let description = task.task.description;
		const firstLine = description?.split("\n")[0];
		const restLines = description?.split("\n").slice(1).join("\n");
		const regexForObsidainLinkInLine = /"obsidian:\/\/open\?file=(.*)">/;
		newTask.task.description = `<p><a target="_blank" rel="noopener noreferrer nofollow" href="obsidian://open?file=${task.filepath}">Link to Obsidian</a></p>`;

		if (firstLine !== undefined && !regexForObsidainLinkInLine.test(firstLine)) {
			newTask.task.description += firstLine;
		}
		newTask.task.description += restLines;
		return newTask
	}

	private getCleanedModelTask(task: ModelsTask): ModelsTask {
		// This needs to be updated, when we have more fields managed in obsidian!
		let bucketId = undefined;
		if (task.done) {
			bucketId = this.plugin.settings.selectBucketForDoneTasks;
		}
		return {
			projectId: task.projectId,
			title: task.title,
			description: task.description,
			done: task.done,
			bucketId: bucketId,
		};
	}
}

export {Tasks};
