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
	}

	async getLabels(): Promise<ModelsLabel[]> {
		let allLabels: ModelsLabel[];
		try {
			allLabels = await this.labelsApi.labelsGet();
		} catch (e) {
			// There is a bug in Vikunja API that returns null instead of an empty array
			console.error("LabelsAPI: Could not get labels", e);
			allLabels = [];
		}
		return allLabels;
	}

	async findLabelByTitle(title: string): Promise<ModelsLabel | undefined> {
		const labels = await this.getLabels();
		return labels.find(label => label.title === title);
	}

	async createLabel(label: ModelsLabel): Promise<ModelsLabel> {
		const param: LabelsPutRequest = {
			label: label,
		};
		return await this.labelsApi.labelsPut(param);
	}

	async createLabels(labels: ModelsLabel[]): Promise<ModelsLabel[]> {
		return Promise.all(labels.map(label => this.createLabel(label)));
	}

	async deleteLabel(labelId: number): Promise<ModelsLabel> {
		const param: LabelsIdDeleteRequest = {
			id: labelId,
		};
		return await this.labelsApi.labelsIdDelete(param);
	}

	async updateLabel(label: ModelsLabel): Promise<ModelsLabel> {
		if (!label.id) throw new Error("Label id is required to update label");
		const param: LabelsIdPutRequest = {
			id: label.id,
			label: label,
		};
		return this.labelsApi.labelsIdPut(param);
	}

	async getAndCreateLabels(labels: ModelsLabel[]): Promise<ModelsLabel[]> {
		const allLabels = await this.getLabels();

		const labelTitles = allLabels.map(label => label.title);
		const alreadyExistingLabels = labels.filter(label => labelTitles.includes(label.title));

		const newLabels = labels.filter(label => !labelTitles.includes(label.title));
		const createdLabels = await this.createLabels(newLabels);
		if (this.plugin.settings.debugging) console.log("LabelsAPI: Created labels", createdLabels);

		return alreadyExistingLabels.concat(createdLabels);
	}

	async deleteUnusedLabels(usedLabels: ModelsLabel[]) {
		const allLabels = await this.getLabels();
		const unusedLabelsFiltered = allLabels.filter(labelFromVikunja => !usedLabels.find(labelFromVault => labelFromVault.title === labelFromVikunja.title));
		if (this.plugin.settings.debugging) console.log("LabelsAPI: Unused labels", unusedLabelsFiltered);

		return Promise.all(unusedLabelsFiltered.map(label =>
			// @ts-ignore
			this.deleteLabel(label.id)
		));
	}
}

export {Label};
