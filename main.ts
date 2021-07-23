import { App, Modal, debounce, Plugin, PluginSettingTab, Setting, TFile, TAbstractFile, } from 'obsidian';
import { IndexItemStyle } from './IndexItemStyle';



interface ZoottelkeeperPluginSettings {
	indexPrefix: string;
	intexItemStyle: IndexItemStyle;

}


const DEFAULT_SETTINGS: ZoottelkeeperPluginSettings = {
	indexPrefix: '',
	intexItemStyle: IndexItemStyle.NoPath,

}

export default class ZoottelkeeperPlugin extends Plugin {
	settings: ZoottelkeeperPluginSettings;
	lastVault: Set<string>;

	triggerUpdateIndexFile = debounce(this.keepTheZooClean.bind(this), 1000, true)

	async onload(): Promise<void> {
		await this.loadSettings()
		this.app.workspace.onLayoutReady(async () => {
			this.loadVault();
			console.debug(`Vault in files: ${JSON.stringify(this.app.vault.getMarkdownFiles().map(f => f.path))}`);

		});
		this.registerEvent(this.app.vault.on("create", this.triggerUpdateIndexFile));
		this.registerEvent(this.app.vault.on("delete", this.triggerUpdateIndexFile));
		this.registerEvent(this.app.vault.on("rename", this.triggerUpdateIndexFile));

		this.addSettingTab(new ZoottelkeeperPluginSettingTab(this.app, this));
	}
	loadVault() {
		this.lastVault = new Set(this.app.vault.getMarkdownFiles().map(file => file.path));
	}
	async keepTheZooClean() {
		console.debug('keeping the zoo clean...');
		if (this.lastVault) {
			const vaultFilePathsSet = new Set(this.app.vault.getMarkdownFiles().map(file => file.path));
			try {

				// getting the changed files using symmetric diff

				let changedFiles = new Set([
					...Array.from(vaultFilePathsSet).filter(currentFile => !this.lastVault.has(currentFile)),
					...Array.from(this.lastVault).filter(currentVaultFile => !vaultFilePathsSet.has(currentVaultFile))
				]);
				console.debug(`changedFiles: ${JSON.stringify(Array.from(changedFiles))}`);
				// getting index files to be updated
				const indexFiles2BUpdated = new Set<string>();

				for (const changedFile of Array.from(changedFiles)) {
					const indexFilePath = this.getIndexFilePath(changedFile);
					if (indexFilePath)
						indexFiles2BUpdated.add(indexFilePath);

					// getting the parents' index notes of each changed file in order to update their links as well (hierarchical backlinks)
					const parentIndexFilePath = this.getIndexFilePath(this.getParentFolder(changedFile));
					if (parentIndexFilePath)
						indexFiles2BUpdated.add(parentIndexFilePath);

				}
				console.debug(`Index files to be updated: ${JSON.stringify(Array.from(indexFiles2BUpdated))}`);

				// update index files 
				for (const indexFile of Array.from(indexFiles2BUpdated)) {
					await this.updateIndexContent(indexFile);
				}

			} catch (e) {
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

	updateIndexContent = async (changedFile: string): Promise<void> => {
		await this.generateIndexContents(changedFile);
	}


	generateIndexContents = async (indexFile: string): Promise<void> => {

		let indexTFile = this.app.vault.getAbstractFileByPath(indexFile) || await this.app.vault.create(indexFile, '');

		if (indexTFile && indexTFile instanceof TFile)
			return this.generateIndexContent(indexTFile);
	}

	generateIndexContent = async (indexTFile: TFile): Promise<void> => {

		const indexContent = indexTFile.parent.children
			.reduce(
				(acc, curr) => {

					acc.push(this.generateIndexItem(curr.path))
					return acc;
				}, []);
		const parentLink = this.getParentFolder(indexTFile.path)
		if (parentLink && parentLink !== '') {
			indexContent.push(this.generateIndexItem(parentLink));
		}
		try {
			if (indexTFile instanceof TFile){
				var newIndexContent = indexContent.filter(function(e) {
					return indexContent.indexOf(e) == indexContent.lastIndexOf(e);
				  });
				  
				newIndexContent.sort(function (a, b) {
					return a.localeCompare(b);
				});

				await this.app.vault.modify(indexTFile, newIndexContent.join('\n'));}
			else {
				throw new Error('Creation index as folder is not supported');
			}
		} catch (e) {
			console.warn('Error during deletion/creation of index files');
		}
	}

	generateIndexItem = (path: string): string => {
		switch(this.settings.intexItemStyle){
			case IndexItemStyle.PureLink:
				return `[[${path}]]`
			case IndexItemStyle.List:
				return `- [[${path}]]`
			case IndexItemStyle.Checkbox:
				return `- [x] [[${path}]]`
			case IndexItemStyle.NoPath:
				path = path.split("/").pop();
				path = path.replace(".md","");
				return `[[${path}]]`
		};
	}
	getIndexFilePath = (filePath: string): string => {

		const fileAbstrPath = this.app.vault.getAbstractFileByPath(filePath);


		if (this.isIndexFile(fileAbstrPath))
			return null;
		let parentPath = this.getParentFolder(filePath);

		// if its parent does not exits, then its a moved subfolder, so it should not be updated
		const parentTFolder = this.app.vault.getAbstractFileByPath(parentPath);
		if (parentPath && parentPath !== '') {
			if (!parentTFolder)
				return undefined;
			parentPath = `${parentPath}/`;
		}
		const parentName = this.getParentFolderName(filePath);

		return `${parentPath}${this.settings.indexPrefix}${parentName}.md`;

	}

	getParentFolder = (filePath: string): string => {
		const fileFolderArray = filePath.split('/');
		fileFolderArray.pop();

		return fileFolderArray.join('/');
	}

	getParentFolderName = (filePath: string): string => {
		const parentFolder = this.getParentFolder(filePath);
		const fileFolderArray = parentFolder.split('/');
		return (fileFolderArray[0] !== '') ? fileFolderArray[fileFolderArray.length - 1] : this.app.vault.getName();
	}

	isIndexFile = (file: TAbstractFile): boolean => {

		return file instanceof TFile && file.name.startsWith(this.settings.indexPrefix);

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
					console.debug('Index prefix: ' + value);
					this.plugin.settings.indexPrefix = value;
					await this.plugin.saveSettings();
				}));
		new Setting(containerEl)
            .setName("Index item style")
            .setDesc("Select the style of the desired index item")
            .addDropdown(async (dropdown) => {
				dropdown.addOption(IndexItemStyle.PureLink, 'Pure Obsidian link');
				dropdown.addOption(IndexItemStyle.List, 'Listed link');
				dropdown.addOption(IndexItemStyle.Checkbox, 'Checkboxed link');
				dropdown.addOption(IndexItemStyle.NoPath, 'No File Path');

                dropdown.setValue(this.plugin.settings.intexItemStyle);
                dropdown.onChange(async (option) => {
					console.debug('Chosen index item style: ' + option);
					this.plugin.settings.intexItemStyle = option as IndexItemStyle;
					await this.plugin.saveSettings();
                });
            });

	}
}
