import { App, debounce, Modal, Plugin, PluginSettingTab, Setting, TFolder, TFile, TAbstractFile, } from 'obsidian';
import * as path from 'path';
import * as fs from 'fs';
import { EOL } from 'os';
import { fileURLToPath } from 'url';

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default'
}

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload(): Promise<void> {
		console.log('loading plugin');
		
		// this.addSettingTab(new SampleSettingTab(this.app, this));
		/*this.triggerUpdateIndexFile = debounce(
			this.triggerUpdateIndexFile.bind(this),
			200,
			false
		  );*/
		this.registerEvent(this.app.vault.on("create", this.triggerUpdateIndexFile ));
		this.registerEvent(this.app.vault.on("delete", this.triggerUpdateIndexFile ));
		this.registerEvent(this.app.vault.on("rename", this.triggerUpdateIndexFile ));

		// sthis.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 1000));
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
		console.log(this.app.vault.getFiles().map(file => file.path).join(','));
	
		const indexContent = indexTFile
			.parent
			.children
			.filter(file => this.getParentFolder(file.path).contains(this.getParentFolder(indexTFile.path)))
			.reduce(
				(acc, curr) => {
					acc.push(`--> [[${curr.name}]]`)
					return acc;
				}, []);
		console.log('FOLDER CONTENT ', indexContent);
		await this.app.vault.modify(indexTFile as TFile, indexContent.join(EOL));
	}
	triggerUpdateIndexFile = async (file: any, oldPath?: string): Promise<void> => {
		if (oldPath){
			
			//console.log(`oldIndexFile: ${oldIndexFile}`)
			const oldIndexFile = await this.getIndexFile(oldPath);
		
			console.log(`old index file: ${oldIndexFile.path}`)
			await this.generateIndexContent(oldIndexFile);

		}
		
		if (file.path.contains('000_Index_of_'))
			return;
	
		const indexTFile = await this.getIndexFile(file.path);
		console.log(`newIndexFile: ${indexTFile.path}`);
		await this.generateIndexContent(indexTFile);

	
	};


	getIndexFile = async (filePath: string): Promise<TAbstractFile> => {
		const parent = this.getParentFolder(filePath);
		const indexFilePath = (parent === '')
				? `000_Index_of_${this.app.vault.getName()}.md`
				:  `${parent}${path.sep}000_Index_of_${parent}.md`;
		let indexAbstrFilePath = this.app.vault.getAbstractFileByPath(indexFilePath);
		if (!indexAbstrFilePath){
			try {
				await this.app.vault.create(indexFilePath, '');
				indexAbstrFilePath = this.app.vault.getAbstractFileByPath(indexFilePath);

			} catch(e){
				Promise.resolve();
			}
		}

		const folder = indexAbstrFilePath.parent;

		const indexFile =  folder.children.find((file:any) => file.path.contains('000_Index_of_'));
		return Promise.resolve(indexFile);

	}
		


	getParentFolder = (filePath: string): string => {
		const fileFolderArray = filePath.split(path.sep);
		fileFolderArray.pop();

		return fileFolderArray.join(path.sep);
	}

}

class SampleModal extends Modal {
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

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		let {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Settings for my awesome plugin.'});

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue('')
				.onChange(async (value) => {
					console.log('Secret: ' + value);
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
