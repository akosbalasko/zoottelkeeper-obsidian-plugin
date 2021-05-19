import { App, debounce, Modal, Plugin, PluginSettingTab, Setting, TFolder, TFile, TAbstractFile, } from 'obsidian';
import * as path from 'path';
import * as fs from 'fs';
import { EOL } from 'os';
import { fileURLToPath } from 'url';

interface ZoottelkeeperPluginSettings {
	indexPrefix: string;
}

const DEFAULT_SETTINGS: ZoottelkeeperPluginSettings = {
	indexPrefix: '_Index_of_'
}

export default class ZoottelkeeperPlugin extends Plugin {
	settings: ZoottelkeeperPluginSettings;
	
	async onload(): Promise<void> {
		await this.loadSettings()
		this.app.workspace.onLayoutReady(() => {
			this.registerEvent(this.app.vault.on("create", this.triggerUpdateIndexFile ));
			this.registerEvent(this.app.vault.on("delete", this.triggerUpdateIndexFile ));
			this.registerEvent(this.app.vault.on("rename", this.triggerUpdateIndexFile ));
	})
		this.addSettingTab(new ZoottelkeeperPluginSettingTab(this.app, this));
	}

	onunload() {
		console.log('unloading plugin');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	generateIndexContent = async (indexTFile: TAbstractFile): Promise<void> => {
		if (!indexTFile.parent)
			return;
	
		const indexContent = indexTFile
			.parent
			.children
			.filter(file => this.getParentFolder(file.path).contains(this.getParentFolder(indexTFile.path)))
			.reduce(
				(acc, curr) => {
					acc.push(`[[${curr.path}]]`)
					return acc;
				}, []);
		indexContent.push(`[[${indexTFile.parent.name}]]`);
		try {
			await this.app.vault.delete(indexTFile as TFile, true);
			await this.app.vault.create(indexTFile.path, indexContent.join(EOL));
		} catch(e){
			console.warn('Error during deletion/creation of index files');
		}
	}

	triggerUpdateIndexFile = async (file: any, oldPath?: string): Promise<void> => {
		if (file.path.contains(this.settings.indexPrefix))
			return;

		if (oldPath){
			
			const oldIndexFile = await this.getIndexFile(oldPath);
			await this.generateIndexContent(oldIndexFile);

		}
	
		const indexTFile = await this.getIndexFile(file.path);
		console.log(`newIndexFile: ${indexTFile.path}`);
		await this.generateIndexContent(indexTFile);

	
	};


	getIndexFile = async (filePath: string): Promise<TAbstractFile> => {
		const parent = this.getParentFolder(filePath);
		let indexFilePath;
		if (parent === '')
			indexFilePath = `${this.settings.indexPrefix}${this.app.vault.getName()}.md`
		else {
			const parentAbstrTFile = this.app.vault.getAbstractFileByPath(parent);
			indexFilePath =`${parent}${path.sep}${this.settings.indexPrefix}${parentAbstrTFile.name}.md`;
		}

		
		let indexAbstrFilePath = this.app.vault.getAbstractFileByPath(indexFilePath);
		if (!indexAbstrFilePath){
			try {
				indexAbstrFilePath = await this.app.vault.create(indexFilePath, '');
				// indexAbstrFilePath = this.app.vault.getAbstractFileByPath(newIndexFile.path);

			} catch(e){
				console.log(e);
				Promise.reject();
			}
		}

		const folder = indexAbstrFilePath.parent;
		const indexFile =  folder.children.find((file:any) => file.path.contains(this.settings.indexPrefix));
		return Promise.resolve(indexFile);

	}
		


	getParentFolder = (filePath: string): string => {
		const fileFolderArray = filePath.split(path.sep);
		fileFolderArray.pop();

		return fileFolderArray.join(path.sep);
	}

}

class ZoottelkeeperPluginModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		let {contentEl} = this;
		
		contentEl.setText('Woah!');
	}

	onClose() {
		let {contentEl} = this;
		contentEl.empty();
	}
	
}

class ZoottelkeeperPluginSettingTab extends PluginSettingTab {
	plugin: ZoottelkeeperPlugin;

	constructor(app: App, plugin: ZoottelkeeperPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		let {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Settings for my awesome plugin.'});

		new Setting(containerEl)
			.setName('Index prefix:')
			.setDesc('It is a prefix of the index file.')
			.addText(text => text
				.setPlaceholder('_Index_of_')
				.setValue('')
				.onChange(async (value) => {
					console.log('Index prefix: ' + value);
					this.plugin.settings.indexPrefix = value;
					await this.plugin.saveSettings();
				}));
	}
}
