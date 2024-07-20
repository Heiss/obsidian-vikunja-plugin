import {App} from "obsidian";
import VikunjaPlugin from "../../main";
import {
	Configuration,
	ModelsBucket,
	ModelsProjectView,
	ModelsProjectViewKind,
	ModelsTask,
	ProjectApi,
	ProjectsIdViewsViewBucketsPutRequest,
	ProjectsProjectViewsGetRequest,
	ProjectsProjectViewsIdPostRequest
} from "../../vikunja_sdk";

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

	async getViewsByProjectId(id: number): Promise<ModelsProjectView[]> {
		const params: ProjectsProjectViewsGetRequest = {
			project: id
		};
		const views = await this.projectsApi.projectsProjectViewsGet(params);
		if(this.plugin.settings.debugging) console.log("Found views", views);

		// @ts-ignore
		const kanbanViews = views.filter(view => view.viewKind === "kanban");
		if (this.plugin.settings.debugging) console.log("Found kanban views", kanbanViews);

		return kanbanViews;
	}

	// Get the done bucket id from the Kanban view
	// If no done bucket is found, create a new one, call it Done
	async getDoneBucketIdFromKanbanView(id: number): Promise<number> {
		const params: ProjectsProjectViewsGetRequest = {
			project: id
		};
		const views = await this.projectsApi.projectsProjectViewsGet(params);
		if (this.plugin.settings.debugging) console.log("Found views", views);

		const kanbanView = views.find(view => view.id === this.plugin.settings.selectedView);
		if (!kanbanView) throw new Error("No Kanban view found");

		let done_bucket = kanbanView.doneBucketId;
		if (done_bucket === undefined) {
			throw new Error("No done bucket id found");
		}

		if (done_bucket === 0) {
			if (kanbanView.id === undefined) throw new Error("No Kanban view id found");

			// create new bucket, so we can set this as done bucket
			const bucket_done: ModelsBucket = {
				title: "Done",
			};
			const params: ProjectsIdViewsViewBucketsPutRequest = {
				id: id,
				view: kanbanView.id,
				bucket: bucket_done,

			}
			const bucket = await this.projectsApi.projectsIdViewsViewBucketsPut(params);
			kanbanView.doneBucketId = bucket.id;
			const paramsView: ProjectsProjectViewsIdPostRequest = {
				project: id,
				id: kanbanView.id,
				view: kanbanView
			}
			const kanbanViewUpdated = await this.projectsApi.projectsProjectViewsIdPost(paramsView);
			if (this.plugin.settings.debugging) console.log("Updated Kanban view", kanbanViewUpdated);
			if (kanbanViewUpdated.doneBucketId === undefined) throw new Error("No done bucket id found");
			done_bucket = kanbanViewUpdated.doneBucketId;
		}
		return done_bucket;
	}
}

export {Projects};
