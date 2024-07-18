import {App} from "obsidian";
import VikunjaPlugin from "../../main";
import {
	Configuration,
	LabelsApi,
	LabelsIdDeleteRequest,
	LabelsIdPutRequest,
	LabelsPutRequest,
	ModelsLabel,
	ModelsLabelTask,
	TasksTaskIDLabelsBulkPostRequest,
	TasksTaskLabelsPutRequest,
} from "../../vikunja_sdk";

class Label {
	plugin: VikunjaPlugin;
	labelsApi: LabelsApi;

	constructor(app: App, plugin: VikunjaPlugin) {
		this.plugin = plugin;
		this.init();
	}

	async addLabelsToTask(id: number, labels: ModelsLabel[]) {

		const params: TasksTaskIDLabelsBulkPostRequest = {
			taskID: id,
			label: {labels}
		};
		await this.labelsApi.tasksTaskIDLabelsBulkPost(params);
	}

	async addLabelToTask(id: number, label: ModelsLabel) {
		const modelLabel: ModelsLabelTask = {
			labelId: label.id,
		};
		const params: TasksTaskLabelsPutRequest = {
			task: id,
			label: modelLabel
		};
		try {
			await this.labelsApi.tasksTaskLabelsPut(params);
		} catch (e) {
			console.error("Error adding label to task", e);
		}
	}

	init() {
		const configuration = new Configuration({
			basePath: this.plugin.settings.vikunjaHost + "/api/v1",
			apiKey: "Bearer " + this.plugin.settings.vikunjaAccessToken,
		});
		this.labelsApi = new LabelsApi(configuration);
	}

	async getLabels(): Promise<ModelsLabel[]> {
		let allLabels: ModelsLabel[] = [];
		try {
			allLabels = await this.labelsApi.labelsGet();
		} catch (e) {
			// There is a bug in Vikunja API that returns null instead of an empty array
			console.error("LabelsAPI: Could not get labels", e);
		}
		return allLabels;
	}

	async findLabelByTitle(title: string): Promise<ModelsLabel | undefined> {
		const labels = await this.getLabels();
		return labels.find(label => label.title === title);
	}

	async createLabel(label: ModelsLabel): Promise<ModelsLabel> {
		if (this.plugin.settings.debugging) console.log("LabelsAPI: Creating label", label);
		const param: LabelsPutRequest = {
			label: label,
		};
		return await this.labelsApi.labelsPut(param);
	}

	async createLabels(labels: ModelsLabel[]): Promise<ModelsLabel[]> {
		return Promise.all(labels.map(label => this.createLabel(label)));
	}

	async deleteLabel(labelId: number) {
		if (this.plugin.settings.debugging) console.log("LabelsAPI: Deleting label", labelId);
		const param: LabelsIdDeleteRequest = {
			id: labelId,
		};
		await this.labelsApi.labelsIdDelete(param);
		if (this.plugin.settings.debugging) console.log("LabelsAPI: Deleted label", labelId);
	}

	async updateLabel(label: ModelsLabel): Promise<ModelsLabel> {
		if (!label.id) throw new Error("Label id is required to update label");
		const param: LabelsIdPutRequest = {
			id: label.id,
			label: label,
		};
		return this.labelsApi.labelsIdPut(param);
	}

	async getOrCreateLabels(labels: ModelsLabel[]): Promise<ModelsLabel[]> {
		if (this.plugin.settings.debugging) console.log("LabelsAPI: Get or create labels", labels);
		// FIXME This call will be placed everytime for every task. It should be cached or optimized away.
		const allLabels = await this.getLabels();
		let createdLabels = new Map<number, ModelsLabel>();

		for (const label of labels) {
			const vikunjaLabel = allLabels.find(l => l.title === label.title);
			if (vikunjaLabel !== undefined && vikunjaLabel.id !== undefined && createdLabels.get(vikunjaLabel.id) === undefined) {
				createdLabels.set(vikunjaLabel.id, vikunjaLabel);
				continue;
			}

			if (this.plugin.settings.debugging) console.log("LabelsAPI: Create label in vikunja", label);
			const createdLabel = await this.createLabel(label);
			if (!createdLabel.id) throw new Error("Label id for freshly created Label is not defined");
			createdLabels.set(createdLabel.id, createdLabel);
		}

		if (this.plugin.settings.debugging) console.log("LabelsAPI: Created labels", createdLabels);
		return Array.from(createdLabels.values());
	}

	async deleteLabels(labels: ModelsLabel[]) {
		for (const label of labels) {
			if (!label.id) throw new Error("Label id is required to delete label");
			await this.deleteLabel(label.id);
		}
	}
}

export {Label};
