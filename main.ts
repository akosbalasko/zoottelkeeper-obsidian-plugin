import { App, Modal, debounce, Plugin, PluginSettingTab, Setting, TFile, TAbstractFile, TFolder, } from 'obsidian';

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
		this.app.workspace.onLayoutReady(async () => {
			this.loadVault();
			console.log(`Vault in files: ${JSON.stringify(this.app.vault.getMarkdownFiles().map(f => f.path))}`);
			this.registerEvent(this.app.vault.on("create", this.triggerUpdateIndexFile));
			this.registerEvent(this.app.vault.on("delete", this.triggerUpdateIndexFile));
			this.registerEvent(this.app.vault.on("rename", this.triggerUpdateIndexFile));

		});
	
		this.addSettingTab(new ZoottelkeeperPluginSettingTab(this.app, this));
	}
	loadVault() {
		this.lastVault = new Set(this.app.vault.getMarkdownFiles().map(file => file.path));
	}
	async keepTheZooClean() {
		console.log('keeping the zoo clean...');
		if (this.lastVault) {
			const vaultFilePathsSet = new Set(this.app.vault.getMarkdownFiles().map(file => file.path));
			try {

				// getting the changed files using symmetric diff

				let changedFiles = new Set([
					...Array.from(vaultFilePathsSet).filter(currentFile => !this.lastVault.has(currentFile)),
					...Array.from(this.lastVault).filter(currentVaultFile => !vaultFilePathsSet.has(currentVaultFile))
				]);
				console.log(`changedFiles: ${JSON.stringify(Array.from(changedFiles))}`);
				// getting index files to be updated
				const indexFiles2BUpdated = new Set<string>();

				for (const changedFile of Array.from(changedFiles)) {
					const indexFilePath = this.getIndexFilePath(changedFile);
					if (indexFilePath)
						indexFiles2BUpdated.add(indexFilePath);
	
					// getting the parents' index notes of each changed file in order to update their links as well (hierarhical backlinks)
					const parentIndexFilePath = this.getIndexFilePath(this.getParentFolder(changedFile));
					if (parentIndexFilePath)
						indexFiles2BUpdated.add(parentIndexFilePath);
				
					// its mandatory because if you move a subFolder, it is recognized as a set of files, but their parent's parent has to be updated also
					// to remove the link from the subfolder parent to the subfolder
					const grandParentIndexFilePath = this.getIndexFilePath(this.getParentFolder(this.getParentFolder(changedFile)));
					if (grandParentIndexFilePath)
						indexFiles2BUpdated.add(grandParentIndexFilePath);

				}
				console.log(`Index files to be updated: ${JSON.stringify(Array.from(indexFiles2BUpdated))}`);

				// update index files 
				for (const indexFile of Array.from(indexFiles2BUpdated)){
					await this.updateIndexContent(indexFile);
				}

			} catch (e) {
			}
		}
		this.lastVault = new Set(this.app.vault.getMarkdownFiles().map(file => file.path));

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

	updateIndexContent = async (changedFile: string): Promise<void> => {
		await this.generateIndexContents(changedFile);
	}


	generateIndexContents = async (indexFile: string): Promise<void> => {

		let indexTFile = this.app.vault.getAbstractFileByPath(indexFile)
		if (!indexTFile)
			indexTFile =  await this.app.vault.create(indexFile, '');
		if (indexTFile && indexTFile instanceof TFile)
			return this.generateIndexContent(indexTFile);
	}

	removeIndexFile = async (indexFile: string): Promise<void> => {
		const deleteIndexFile = async (file: TAbstractFile): Promise<void> => {
			return this.app.vault.delete(file, true);

		}
		const indexTFile = this.app.vault.getAbstractFileByPath(indexFile)
		if (indexTFile)
			return this.app.vault.delete(indexTFile, true);
	}

	generateIndexContent = async (indexTFile: TFile): Promise<void> => {

		if (indexTFile.name.contains('zottelTest'))
			console.log('its the root');
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
			await this.app.vault.modify(indexTFile as TFile, indexContent.join('\n'));
		} catch (e) {
			console.warn('Error during deletion/creation of index files');
		}
	}

	getIndexFilePath = (filePath: string): string => {

		const fileAbstrPath = this.app.vault.getAbstractFileByPath(filePath);

		
		if (this.isIndexFile(fileAbstrPath))
			return null;
		let parentPath = this.getParentFolder(filePath);

		// if its parent does not exits, then its a moved subfolder, so it should not be updated
		const parentTFolder = this.app.vault.getAbstractFileByPath(parentPath);
		if (parentPath && parentPath !==''){
			if (!parentTFolder)
				return undefined;
			parentPath = `${parentPath}/`;
		}
		
		const parentName  = this.getParentFolderName(filePath);


		const indexFilePath = `${parentPath}${this.settings.indexPrefix}${parentName}.md`;

		return indexFilePath;

	}

	getParentFolder = (filePath: string): string => {
		const fileFolderArray = filePath.split('/');
		fileFolderArray.pop();

		return fileFolderArray.join('/');
	}

	getParentFolderName = (filePath: string): string => {
		const parentFolder = this.getParentFolder(filePath);
		const fileFolderArray =  parentFolder.split('/');
		return (fileFolderArray[0] !== '') ? fileFolderArray[fileFolderArray.length-1] : this.app.vault.getName();
	}

	isIndexFile = (file: TAbstractFile): boolean => {

		return file instanceof TFile  &&file.name.startsWith(this.settings.indexPrefix);

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
		let { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'Settings for Zoottelkeeper plugin' });

		new Setting(containerEl)
			.setName('Index prefix:')
			.addText(text => text
				.setPlaceholder('_Index_of_')
				.setValue(this.plugin.settings.indexPrefix)
				.onChange(async (value) => {
					console.log('Index prefix: ' + value);
					this.plugin.settings.indexPrefix = value;
					await this.plugin.saveSettings();
				}));

	}
}
