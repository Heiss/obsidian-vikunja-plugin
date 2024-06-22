import {App} from "obsidian";
import VikunjaPlugin from "../../main";
import {Configuration, UserApi, UserUser} from "../../vikunja_sdk";

class User {
	plugin: VikunjaPlugin;
	userApi: UserApi;

	constructor(app: App, plugin: VikunjaPlugin) {
		this.plugin = plugin;
		this.init();
	}

	init() {
		const configuration = new Configuration({
			basePath: this.plugin.settings.vikunjaHost + "/api/v1",
			apiKey: "Bearer " + this.plugin.settings.vikunjaAccessToken,
		});
		this.userApi = new UserApi(configuration);
	}

	async getUser(): Promise<UserUser> {
		return this.userApi.userGet();
	}
}

export {User};
