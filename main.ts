import { App, Modal, debounce, Plugin, PluginSettingTab, Setting, TFile, TAbstractFile, } from 'obsidian';
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
	lastVault: Set<string>;

	triggerUpdateIndexFile = debounce(this.keepTheZooClean.bind(this), 3000, true)

	async onload(): Promise<void> {
		await this.loadSettings()
		this.app.workspace.onLayoutReady( async () => {
			this.loadVault();
			console.debug(`Vault in files: ${JSON.stringify(this.app.vault.getMarkdownFiles().map(f => f.path))}`);
			this.registerEvent(this.app.vault.on("create", this.triggerUpdateIndexFile ));
			this.registerEvent(this.app.vault.on("delete", this.triggerUpdateIndexFile ));
			this.registerEvent(this.app.vault.on("rename", this.triggerUpdateIndexFile ));
	})
		this.addSettingTab(new ZoottelkeeperPluginSettingTab(this.app, this));
	}
	loadVault() {
		this.lastVault = new Set(this.app.vault.getMarkdownFiles().map(file => file.path));
	}
	async keepTheZooClean() {
		if (this.lastVault) {
			const vaultFilePathsSet = new Set(this.app.vault.getMarkdownFiles().map(file => file.path));
			try {

			let changedFiles = new Set([
				...Array.from(vaultFilePathsSet).filter(currentFile => !this.lastVault.has(currentFile)),
				...Array.from(this.lastVault).filter(currentVaultFile => !vaultFilePathsSet.has(currentVaultFile))
			])
			// todo: update the unique index files only.
			const updatedIndexFiles = new Set<TAbstractFile>();
			for (const changedFile of changedFiles){
				let indexFile = await this.getIndexFile(changedFile)
					|| await this.getIndexFile(this.getParentFolder(changedFile));
				if (!updatedIndexFiles.has(indexFile)){
					await this.updateIndexContent(indexFile.path);
					await this.updateIndexContent(this.getParentFolder(indexFile.path));
					await this.updateIndexContent(this.getParentFolder(this.getParentFolder(indexFile.path)));
					updatedIndexFiles.add(indexFile);
				}

			}
			console.debug(`Changed Files: ${JSON.stringify(changedFiles)}`);
		} catch(e){
		}
	}
	this.lastVault = new Set(this.app.vault.getMarkdownFiles().map(file => file.path));

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
			// .filter(file => this.getParentFolder(file.path).contains(this.getParentFolder(indexTFile.path)))
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

			indexFilePath =`${parent}/${this.settings.indexPrefix}${parentAbstrTFile.name}.md`;
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
		const fileFolderArray = filePath.split('/');
		fileFolderArray.pop();

		return fileFolderArray.join('/');
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

		containerEl.createEl('h2', {text: 'Settings for Zoottelkeeper plugin'});

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

	}
}
