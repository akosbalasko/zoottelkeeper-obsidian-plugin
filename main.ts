import { App, Modal, Plugin, PluginSettingTab, Setting, TFolder, TFile, TAbstractFile, } from 'obsidian';
import * as path from 'path';
import { EOL } from 'os';

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
			this.registerEvent(this.app.vault.on("rename", this.triggerMoveIndexFile ));
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

	triggerMoveIndexFile = async (file: any, oldPath: string): Promise<void> => {

		console.log(`file ${file.name} touched, path: ${file.path} `);
		if (file.path.contains(this.settings.indexPrefix))
			return Promise.resolve();
		else {
			await this.removeMainIndexContentOnly(oldPath);
			await this.updateMainIndexContentOnly(oldPath);
			await this.updateIndexContent(file.path);
		}
	};
	removeMainIndexContentOnly = async (oldFilePath: string): Promise<void> => {
		const oldIndexFilePath = await this.getIndexFile(oldFilePath);
		if (oldIndexFilePath)
			await this.app.vault.delete(oldIndexFilePath, true);
	}
	updateMainIndexContentOnly = async (oldFilePath: string): Promise<void> => {
		const oldIndexFilePath = await this.getIndexFile(oldFilePath);
		if (oldIndexFilePath)
			await this.generateIndexContent(oldIndexFilePath.path);

	}
	triggerUpdateIndexFile = async (file: any): Promise<void> => {
		console.log(`file ${file.name} touched, path: ${file.path} `);
		if (file.path.contains(this.settings.indexPrefix))
			return Promise.resolve();
		else {
			await this.updateIndexContent(file.path);
		}
	};


	updateIndexContent= async (changedFilePath: string): Promise<void> => {
		await this.removeIndexFile(changedFilePath);
		await this.generateIndexContents(changedFilePath);
	}

	isFolder = (file: TAbstractFile): boolean => {
		return Object.getPrototypeOf(file) === TFolder.prototype;
	}

	generateIndexContents = async (indexFilePath: string): Promise<void> => {
		const createIndexFile = async (file: TAbstractFile): Promise<void> => {
			await this.generateIndexContent(file.path)
		}
		return this.performActionOnFolder(indexFilePath, createIndexFile);
	}

	removeIndexFile = async (indexFilePath: string): Promise<void> => {
		const deleteIndexFile = async (file: TAbstractFile): Promise<void> => {
			return this.app.vault.delete(file, true);

		}
		return this.performActionOnFolder(indexFilePath, deleteIndexFile);
	}

	performActionOnFolder= async (indexFilePath: string, func: Function): Promise<void> => {
		const indexTFile: TAbstractFile = await this.getIndexFile(indexFilePath);
		const indexAbstFilePath = this.app.vault.getAbstractFileByPath(indexFilePath);
		if (indexTFile){
			// const folders = indexTFile.parent.children.filter(file => this.isFolder(file));
			await func(indexTFile);
			/*
			if (!this.isRootIndex(indexTFile.path) && (!indexAbstFilePath || this.isFolder(indexAbstFilePath))){
				const indexInFolder = await this.getIndexFileOfAFolder(indexTFile.path);
				await func(indexInFolder);

				for (const folder of folders){
					const indexInFolder = await this.getIndexFileOfAFolder(folder.path);
					if (indexInFolder)
						await this.performActionOnFolder(indexInFolder.path, func);	
				}
			}*/
		}
 
	}

	isRootIndex = (rootIndexCandidate: string): boolean => {
		return rootIndexCandidate === `${this.settings.indexPrefix}${this.app.vault.getName()}.md`
	}
	generateIndexContent = async (indexFilePath: string): Promise<void> => {
		const indexTFile: TAbstractFile = await this.getIndexFile(indexFilePath); 
		console.log(`newIndexFile: ${indexTFile.path}`);

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
		const parentLink = this.getParentFolder(indexTFile.path)
		indexContent.push(`[[${parentLink}]]`);
		try {
			// await this.app.vault.delete(indexTFile as TFile, true);
			await this.app.vault.modify(indexTFile as TFile, indexContent.join(EOL));
		} catch(e){
			console.warn('Error during deletion/creation of index files');
		}
	}

	getIndexFileOfAFolder = async (folderPath: string): Promise<TAbstractFile> => {
		const parent = this.getParentFolder(folderPath);
		
		let indexFilePath;

		if (parent === '')
			indexFilePath = `${this.settings.indexPrefix}${this.app.vault.getName()}.md`
		else {
			const parentAbstrTFile = this.app.vault.getAbstractFileByPath(parent);

			indexFilePath =`${folderPath}${path.sep}${this.settings.indexPrefix}${parentAbstrTFile.name}.md`;
		}

		let indexAbstrFilePath = this.app.vault.getAbstractFileByPath(indexFilePath);
		/*if (!indexAbstrFilePath){
			try {
				indexAbstrFilePath = await this.app.vault.create(indexFilePath, '');
				// indexAbstrFilePath = this.app.vault.getAbstractFileByPath(newIndexFile.path);

			} catch(e){
				console.log(e);
				Promise.reject();
			}
		}*/
		return indexAbstrFilePath;
	}
	getIndexFile = async (filePath: string): Promise<TAbstractFile> => {
		const parent = this.getParentFolder(filePath);
		let indexFilePath;
		if (parent === '')
			indexFilePath = `${this.settings.indexPrefix}${this.app.vault.getName()}.md`
		else {
			const parentAbstrTFile = this.app.vault.getAbstractFileByPath(parent);
			if(!parentAbstrTFile){
				// it has moved
				return null;
			}

			indexFilePath =`${parent}${path.sep}${this.settings.indexPrefix}${parentAbstrTFile.name}.md`;
		}

		
		let indexAbstrFilePath = this.app.vault.getAbstractFileByPath(indexFilePath);
		if (!indexAbstrFilePath){
			try {
				indexAbstrFilePath = await this.app.vault.create(indexFilePath, '');
				// indexAbstrFilePath = this.app.vault.getAbstractFileByPath(newIndexFile.path);

			} catch(e){
				console.log(e);
				Promise.resolve(null);
			}
		}
/*
		const folder = indexAbstrFilePath.parent;
		const indexFile =  folder.children.find((file:any) => file.path.contains(this.settings.indexPrefix));
		return Promise.resolve(indexFile);*/
		return indexAbstrFilePath;

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
