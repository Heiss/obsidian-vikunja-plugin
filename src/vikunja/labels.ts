import {App} from "obsidian";
import VikunjaPlugin from "../../main";
import {
	Configuration,
	LabelsApi,
	LabelsIdDeleteRequest,
	LabelsIdPutRequest,
	LabelsPutRequest,
	ModelsLabel,
} from "../../vikunja_sdk";

class Label {
	plugin: VikunjaPlugin;
	labelsApi: LabelsApi;
	labelsMap: Map<string, ModelsLabel>;

	constructor(app: App, plugin: VikunjaPlugin) {
		this.plugin = plugin;
		this.init();
	}

	init() {
		const configuration = new Configuration({
			basePath: this.plugin.settings.vikunjaHost + "/api/v1",
			apiKey: "Bearer " + this.plugin.settings.vikunjaAccessToken,
		});
		this.labelsApi = new LabelsApi(configuration);
		this.labelsMap = new Map<string, ModelsLabel>();
		this.loadLabels().then();
	}

	getLabels(): ModelsLabel[] {
		return Array.from(this.labelsMap.values());
	}

	async findLabelByTitle(title: string): Promise<ModelsLabel> {
		const labels = this.labelsMap.get(title);
		if (labels === undefined) throw new Error("Label not found");
		return labels;
	}

	async createLabel(label: ModelsLabel): Promise<ModelsLabel> {
		if (this.plugin.settings.debugging) console.log("LabelsAPI: Creating label", label);
		if (!label.title) throw new Error("Label title is required to create label");
		if (this.labelsMap.has(label.title)) throw new Error("Label already exists");

		const param: LabelsPutRequest = {
			label: label,
		};
		const createdLabel = await this.labelsApi.labelsPut(param);

		if (createdLabel.title === undefined) throw new Error("Label title is not defined");
		this.labelsMap.set(createdLabel.title, createdLabel);
		if (this.plugin.settings.debugging) console.log("LabelsAPI: Created label", createdLabel);

		return createdLabel;
	}

	async createLabels(labels: ModelsLabel[]): Promise<ModelsLabel[]> {
		return Promise.all(labels.map(label => this.createLabel(label)));
	}

	async getOrCreateLabels(labels: ModelsLabel[]): Promise<ModelsLabel[]> {
		const labelsInVikunjaExisting = labels.filter(label => label.title && this.labelsMap.has(label.title));
		const labelsInVikunjaMissing = labels.filter(label => label.title && !this.labelsMap.has(label.title));

		const createdLabel = await Promise.all(labelsInVikunjaMissing.map(label => this.createLabel(label)));
		if (this.plugin.settings.debugging) console.log("LabelsAPI: Created labels", createdLabel);
		const concatLabels = labelsInVikunjaExisting.concat(createdLabel);
		if (this.plugin.settings.debugging) console.log("LabelsAPI: Returning labels", concatLabels);
		// @ts-ignore
		const labelsWithId: ModelsLabel[] = concatLabels.map(label => this.labelsMap.get(label.title)).filter(label => label !== undefined);
		if (this.plugin.settings.debugging) console.log("LabelsAPI: Returning labels with id", labelsWithId);
		return labelsWithId;
	}

	async getOrCreateLabel(label: ModelsLabel): Promise<ModelsLabel> {
		if (!label.title) throw new Error("Label title is required to get or create label");
		const existingLabel = this.labelsMap.get(label.title);
		if (existingLabel) return existingLabel;
		return await this.createLabel(label);
	}

	async deleteLabel(label: ModelsLabel) {
		if (!label.id) throw new Error("Label id is required to delete label");
		if (!label.title) throw new Error("Label title is required to delete label");

		if (this.plugin.settings.debugging) console.log("LabelsAPI: Deleting label", label);
		const param: LabelsIdDeleteRequest = {
			id: label.id,
		};
		await this.labelsApi.labelsIdDelete(param);
		if (this.plugin.settings.debugging) console.log("LabelsAPI: Deleted label", label);
		this.labelsMap.delete(label.title);
	}

	async updateLabel(label: ModelsLabel): Promise<ModelsLabel> {
		if (!label.id) throw new Error("Label id is required to update label");
		if (!label.title) throw new Error("Label title is required to update label");

		const param: LabelsIdPutRequest = {
			id: label.id,
			label: label,
		};

		this.labelsMap.set(label.title, label);
		return this.labelsApi.labelsIdPut(param);
	}

	async deleteLabels(labels: ModelsLabel[]) {
		for (const label of labels) {
			if (!label.id) throw new Error("Label id is required to delete label");
			await this.deleteLabel(label);
		}
	}

	//Use with caution!!! Only use it in a place, where no other operations are currently running
	async loadLabels(): Promise<ModelsLabel[]> {
		this.labelsMap.clear();
		let allLabels: ModelsLabel[] = [];
		try {
			allLabels = await this.labelsApi.labelsGet();
		} catch (e) {
			// There is a bug in Vikunja API that returns null instead of an empty array
			if (e instanceof TypeError) console.info("LabelsAPI: No labels there");
			else
				console.error("LabelsAPI: Could not get labels", e);
		}
		allLabels.forEach(label => {
			if (label.title === undefined) throw new Error("Label title is not defined");
			this.labelsMap.set(label.title, label);
		});
		return allLabels;
	}
}

export {Label};
