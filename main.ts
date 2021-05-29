import { App, Modal, Plugin, PluginSettingTab, Setting, TFile, TAbstractFile, } from 'obsidian';
import * as path from 'path';
import { EOL } from 'os';

interface ZoottelkeeperPluginSettings {
	indexPrefix: string;
	checkInterval: number;
}

const DEFAULT_SETTINGS: ZoottelkeeperPluginSettings = {
	indexPrefix: '_Index_of_',
	checkInterval: 5,
}

export default class ZoottelkeeperPlugin extends Plugin {
	settings: ZoottelkeeperPluginSettings;
	lastVault: Array<string>;

	async onload(): Promise<void> {
		await this.loadSettings()
		this.app.workspace.onLayoutReady(() => {
			console.debug(`Vault in files: ${JSON.stringify(this.app.vault.getFiles().map(f => f.path))}`);
			this.registerInterval(window.setInterval(async () => await this.keepTheZooClean(), this.settings.checkInterval * 1000));

	})
		this.addSettingTab(new ZoottelkeeperPluginSettingTab(this.app, this));
	}

	async keepTheZooClean() {
		if (this.lastVault) {
			try {
			let changedFiles: Array<string> = [
				...this.app.vault.getFiles().filter(currentFile => !this.lastVault.includes(currentFile.path)).map(file => file.path),
				...this.lastVault.filter(currentFile => !this.app.vault.getFiles().map(file => file.path).includes(currentFile))
			];

			let uniqueIndexedChangedFiles: Array<string> = [];
			for (const changedFile of changedFiles){
				if (uniqueIndexedChangedFiles.every(file => this.getParentFolder(changedFile) !== this.getParentFolder(file))){
					uniqueIndexedChangedFiles.push(changedFile);
				}
			}

			for (const changedFile of uniqueIndexedChangedFiles){
				let indexFile = await this.getIndexFile(changedFile)
					|| await this.getIndexFile(this.getParentFolder(changedFile));
				
				await this.updateIndexContent(indexFile.path);
				await this.updateIndexContent(this.getParentFolder(indexFile.path));
				await this.updateIndexContent(this.getParentFolder(this.getParentFolder(indexFile.path)));

			}
			console.debug(`Changed Files: ${JSON.stringify(changedFiles)}`);
		} catch(e){
		}
	}
	this.lastVault = this.app.vault.getFiles().map(file => file.path);

	}

	onunload() {

		console.debug('unloading plugin');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	updateIndexContent= async (changedFilePath: string): Promise<void> => {
		await this.removeIndexFile(changedFilePath);
		await this.generateIndexContents(changedFilePath);
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
		if (indexTFile){
			await func(indexTFile);
		} else {
			console.debug('no parent, nothing to do ');
		}
 
	}

	generateIndexContent = async (indexFilePath: string): Promise<void> => {
		const indexTFile: TAbstractFile = await this.getIndexFile(indexFilePath); 
		console.debug(`newIndexFile: ${indexTFile.path}`);

		if (!indexTFile.parent){
			console.debug('no parent, return...');
			return;
		}
	
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
			await this.app.vault.modify(indexTFile as TFile, indexContent.join(EOL));
		} catch(e){
			console.warn('Error during deletion/creation of index files');
		}
	}

	getIndexFile = async (filePath: string): Promise<TAbstractFile> => {
		const parent = this.getParentFolder(filePath);
		let indexFilePath;
		if (parent === '')
			indexFilePath = `${this.settings.indexPrefix}${this.app.vault.getName()}.md`
		else {
			const parentAbstrTFile = this.app.vault.getAbstractFileByPath(parent);
			if(!parentAbstrTFile){
				console.debug(`${parent}, it has moved`);
				return null;
			}

			indexFilePath =`${parent}${path.sep}${this.settings.indexPrefix}${parentAbstrTFile.name}.md`;
		}

		
		let indexAbstrFilePath = this.app.vault.getAbstractFileByPath(indexFilePath);
		if (!indexAbstrFilePath){
			try {
				indexAbstrFilePath = await this.app.vault.create(indexFilePath, '');

			} catch(e){
				console.debug(e);
				return null;
			}
		}

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
			.addText(text => text
				.setPlaceholder('_Index_of_')
				.setValue(this.plugin.settings.indexPrefix)
				.onChange(async (value) => {
					console.debug('Index prefix: ' + value);
					this.plugin.settings.indexPrefix = value;
					await this.plugin.saveSettings();
				}));
		new Setting(containerEl)
			.setName('Index update interval (sec):')
			.setDesc('Please note that it must be a number.')
			.addText(intervalNumb => intervalNumb
				.setPlaceholder('5')
				.setValue(this.plugin.settings.checkInterval.toString())
				.onChange(async (value) => {
					console.debug('intervalNumb: ' + value);
					try {
						this.plugin.settings.checkInterval = Number(value);
						await this.plugin.saveSettings();
					} catch(e) {

					}
				}));
	}
}
