# Obsidian Vikunja Plugin

This **unofficial** plugin connects Obsidian and [Vikunja](https://vikunja.io). Vikunja is a todo-App and task manager that helps you to organize your life. It can be used as a self-host replacement for [todoist.com](todoist.com/). Synchronize with this plugin your vault with your Vikunja instance back and forth. It holds a lot of settings to customize it to your workflow needs.

This plugin depends on some other plugins to work: (subject to change with later updates)

- [Dataview Plugin]()
- [Daily Note Core Plugin]()

The experience with this plugin is a lot like the excellent plugins for todoist:

- [Ultimate Todoist Sync for Obsidian Plugin](https://github.com/HeroBlackInk/ultimate-todoist-sync-for-obsidian)
- [Obsidian Todoist Plugin](https://github.com/jamiebrynes7/obsidian-todoist-plugin)

## Bugs

### Wrong timezone configured on device or vikunja instance

Your Vikunja could have a different timezone setting then you on your device. This leads to a bug, where updating always
prefer one of your devices. Set the correct [timezone](https://vikunja.io/docs/config-options/#timezone) in your Vikunja
instance.

## Contributing

- Clone this repo.
- Make sure your NodeJS is at least v16 (`node --version`).
- `npm i` or `yarn` to install dependencies.
- `npm run dev` to start compilation in watch mode.

### This plugin uses openapi-generator

So you need a Java Runtime Environment (JRE). Install at least Java 11.
Then you can use `npx openapi-generator-cli` to rebuild the sdk for vikunja api.

```bash
npx openapi-generator-cli generate -i https://try.vikunja.io/api/v1/docs.json -o vikunja_sdk -g typescript-fetch --additional-properties "supportsES6=true,npmVersion=10.8.1,typescriptThreePlus=true"
# or
npm run gen-sdk
```

### Release

> You can simplify the version bump process by running `npm version patch`, `npm version minor` or `npm version major`
> after updating `minAppVersion` manually in `manifest.json`.
> The command will bump version in `manifest.json` and `package.json`, and add the entry for the new version
> to `versions.json`

## Manually installing the plugin

- Copy over `main.js`, `styles.css`, `manifest.json` to your vault `VaultFolder/.obsidian/plugins/your-plugin-id/`.

## Improve code quality with eslint (optional)

- [ESLint](https://eslint.org/) is a tool that analyzes your code to quickly find problems. You can run ESLint against
  your plugin to find common bugs and ways to improve your code.
- To use eslint with this project, make sure to install eslint from terminal:
	- `npm install -g eslint`
- To use eslint to analyze this project use this command:
	- `eslint main.ts`
	- eslint will then create a report with suggestions for code improvement by file and line number.
- If your source code is in a folder, such as `src`, you can use eslint with this command to analyze all files in that
  folder:
	- `eslint .\src\`

## API Documentation

See https://github.com/obsidianmd/obsidian-api
