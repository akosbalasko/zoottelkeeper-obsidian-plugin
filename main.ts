import { App, Modal, debounce, Plugin, PluginSettingTab, Setting, TFile, TAbstractFile, } from 'obsidian';
import { IndexItemStyle } from './IndexItemStyle';

interface ZoottelkeeperPluginSettings {
	indexPrefix: string;
	indexItemStyle: IndexItemStyle;
	indexTagValue: string;
	indexTagBoolean: boolean;
}

interface GeneralContentOptions {
	items: Array<TAbstractFile>;
	initValue: Array<string>;
	func: Function;
}

const DEFAULT_SETTINGS: ZoottelkeeperPluginSettings = {
	indexPrefix: '_Index_of_',
	indexItemStyle: IndexItemStyle.PureLink,
	indexTagValue: 'MOC',
	indexTagBoolean: true,
};

export default class ZoottelkeeperPlugin extends Plugin {
	settings: ZoottelkeeperPluginSettings;
	lastVault: Set<string>;

	triggerUpdateIndexFile = debounce(
		this.keepTheZooClean.bind(this),
		3000,
		true
	);

	async onload(): Promise<void> {
		await this.loadSettings();
		this.app.workspace.onLayoutReady(async () => {
			this.loadVault();
			console.debug(
				`Vault in files: ${JSON.stringify(
					this.app.vault.getMarkdownFiles().map((f) => f.path)
				)}`
			);
		});
		this.registerEvent(
			this.app.vault.on('create', this.triggerUpdateIndexFile)
		);
		this.registerEvent(
			this.app.vault.on('delete', this.triggerUpdateIndexFile)
		);
		this.registerEvent(
			this.app.vault.on('rename', this.triggerUpdateIndexFile)
		);

		this.addSettingTab(new ZoottelkeeperPluginSettingTab(this.app, this));
	}
	loadVault() {
		this.lastVault = new Set(
			this.app.vault.getMarkdownFiles().map((file) => file.path)
		);
	}
	async keepTheZooClean() {
		console.debug('keeping the zoo clean...');
		if (this.lastVault) {
			const vaultFilePathsSet = new Set(
				this.app.vault.getMarkdownFiles().map((file) => file.path)
			);
			try {
				// getting the changed files using symmetric diff

				let changedFiles = new Set([
					...Array.from(vaultFilePathsSet).filter(
						(currentFile) => !this.lastVault.has(currentFile)
					),
					...Array.from(this.lastVault).filter(
						(currentVaultFile) => !vaultFilePathsSet.has(currentVaultFile)
					),
				]);
				console.debug(
					`changedFiles: ${JSON.stringify(Array.from(changedFiles))}`
				);
				// getting index files to be updated
				const indexFiles2BUpdated = new Set<string>();

				for (const changedFile of Array.from(changedFiles)) {
					const indexFilePath = this.getIndexFilePath(changedFile);
					if (indexFilePath) indexFiles2BUpdated.add(indexFilePath);

					// getting the parents' index notes of each changed file in order to update their links as well (hierarhical backlinks)
					const parentIndexFilePath = this.getIndexFilePath(
						this.getParentFolder(changedFile)
					);
					if (parentIndexFilePath) indexFiles2BUpdated.add(parentIndexFilePath);
				}
				console.debug(
					`Index files to be updated: ${JSON.stringify(
						Array.from(indexFiles2BUpdated)
					)}`
				);

				// update index files
				for (const indexFile of Array.from(indexFiles2BUpdated)) {
					await this.updateIndexContent(indexFile);
				}
			} catch (e) {}
		}
		this.lastVault = new Set(
			this.app.vault.getMarkdownFiles().map((file) => file.path)
		);
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
	};

	generateIndexContents = async (indexFile: string): Promise<void> => {
		let indexTFile =
			this.app.vault.getAbstractFileByPath(indexFile) ||
			(await this.app.vault.create(indexFile, ''));

		if (indexTFile && indexTFile instanceof TFile)
			return this.generateIndexContent(indexTFile);
	};

	

	generateGeneralIndexContent = (options: GeneralContentOptions): Array<string> => {
		return options.items
			.reduce(
				(acc, curr) => {
					acc.push(options.func(curr.path));
					return acc;
				}, options.initValue);

	}

	generateIndexContent = async (indexTFile: TFile): Promise<void> => {

		let indexContent;
		// get subFolders
		//const subFolders = indexTFile.parent.children.filter(item => !this.isFile(item));
		//const files = indexTFile.parent.children.filter(item => this.isFile(item));

		const splitItems = indexTFile.parent.children.reduce(
			(acc,curr) => {
				if (this.isFile(curr))
					acc['files'].push(curr)
				else acc['subFolders'].push(curr);
				return acc;
			}, {subFolders: [], files: []}
		)

		indexContent = this.generateGeneralIndexContent({
			items: splitItems.subFolders,
			func: this.generateIndexFolderItem,
			initValue: [],
		})
		indexContent = this.generateGeneralIndexContent({
			items: splitItems.files.filter(file => file.name !== indexTFile.name ),
			func: this.generateIndexItem,
			initValue: indexContent,
		})

		/*indexContent = subFolders
			.reduce(
				(acc, curr) => {
					acc.push(this.generateIndexFolderItem(curr.path));
					return acc;
				}, []);

		indexContent = files
			.filter(file => file.name !== indexTFile.name )
			.reduce(
				(acc, curr) => {
					acc.push(this.generateIndexItem(curr.path))
					return acc;
				}, indexContent);
		*/

		try {
			if (indexTFile instanceof TFile){
				if (this.settings.indexTagBoolean === true) {
					const tag = this.settings.indexTagValue;
					// if one or multiple index-tags are set, they are inserted at the beginning of the index-array
					indexContent.unshift(`---\ntags: [${tag}]\n---\n`);
				}			
				await this.app.vault.modify(indexTFile, indexContent.join('\n'));
			} else {
				throw new Error('Creation index as folder is not supported');
			}
		} catch (e) {
			console.warn('Error during deletion/creation of index files');
		}
	};

	generateIndexItem = (path: string): string => {
		switch (this.settings.indexItemStyle) {
			case IndexItemStyle.PureLink:
				return `[[${path}]]`;
			case IndexItemStyle.List:
				return `- [[${path}]]`;
			case IndexItemStyle.Checkbox:
				return `- [ ] [[${path}]]`
		};
	}

	generateIndexFolderItem = (path: string): string => {
		return this.generateIndexItem(this.getInnerIndexFilePath(path));
	}

	getInnerIndexFilePath = (folderPath: string): string => {
		const folderName = this.getFolderName(folderPath);
		return `${folderPath}/${this.settings.indexPrefix}${folderName}.md`;
	}
	getIndexFilePath = (filePath: string): string => {
		const fileAbstrPath = this.app.vault.getAbstractFileByPath(filePath);

		if (this.isIndexFile(fileAbstrPath)) return null;
		let parentPath = this.getParentFolder(filePath);

		// if its parent does not exits, then its a moved subfolder, so it should not be updated
		const parentTFolder = this.app.vault.getAbstractFileByPath(parentPath);
		if (parentPath && parentPath !== '') {
			if (!parentTFolder) return undefined;
			parentPath = `${parentPath}/`;
		}
		const parentName = this.getParentFolderName(filePath);

		return `${parentPath}${this.settings.indexPrefix}${parentName}.md`;
	};

	getParentFolder = (filePath: string): string => {
		const fileFolderArray = filePath.split('/');
		fileFolderArray.pop();

		return fileFolderArray.join('/');
	};

	getParentFolderName = (filePath: string): string => {
		const parentFolder = this.getParentFolder(filePath);
		const fileFolderArray = parentFolder.split('/');
		return fileFolderArray[0] !== ''
			? fileFolderArray[fileFolderArray.length - 1]
			: this.app.vault.getName();
	};

	getFolderName = (folderPath: string): string => {
		const folderArray = folderPath.split('/');
		return (folderArray[0] !== '') ? folderArray[folderArray.length - 1] : this.app.vault.getName();
	}

	isIndexFile = (item: TAbstractFile): boolean => {

		return this.isFile(item)
			&& (this.settings.indexPrefix === ''
				? item.name === item.parent.name
				: item.name.startsWith(this.settings.indexPrefix));
	}

	isFile = (item: TAbstractFile): boolean => {
		return item instanceof TFile;
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
		containerEl.createEl('h2', { text: 'Zoottelkeeper Settings' });

		containerEl.createEl('h3', { text: 'General Settings' });

		new Setting(containerEl)
			.setName('List Style')
			.setDesc('Select the style of the index-list.')
			.addDropdown(async (dropdown) => {
				dropdown.addOption(IndexItemStyle.PureLink, 'Pure Obsidian link');
				dropdown.addOption(IndexItemStyle.List, 'Listed link');
				dropdown.addOption(IndexItemStyle.Checkbox, 'Checkboxed link');

				dropdown.setValue(this.plugin.settings.indexItemStyle);
				dropdown.onChange(async (option) => {
					console.debug('Chosen index item style: ' + option);
					this.plugin.settings.indexItemStyle = option as IndexItemStyle;
					await this.plugin.saveSettings();
				});
			});

		// index prefix
		new Setting(containerEl)
			.setName('Index Prefix')
			.setDesc(
				'Per default the file is named after your folder, but you can prefix it here.'
			)
			.addText((text) =>
				text
					.setPlaceholder('')
					.setValue(this.plugin.settings.indexPrefix)
					.onChange(async (value) => {
						console.debug('Index prefix: ' + value);
						this.plugin.settings.indexPrefix = value;
						await this.plugin.saveSettings();
					})
			);
			containerEl.createEl('h4', { text: 'Meta Tags' });

			// Enabling Meta Tags
			new Setting(containerEl)
				.setName('Enable Meta Tags')
				.setDesc(
					"You can add Meta Tags at the top of your index-file. This is useful when you're using the index files as MOCs."
				)
				.addToggle((t) => {
					t.setValue(this.plugin.settings.indexTagBoolean);
					t.onChange(async (v) => {
						this.plugin.settings.indexTagBoolean = v;
						await this.plugin.saveSettings();
					});
				});
	
			// setting the meta tag value
			new Setting(containerEl)
				.setName('Set Meta Tags')
				.setDesc(
					'You can add one or multiple tags to your index-files! There is no need to use "#", just use commas between tags.'
				)
				.addText((text) =>
					text
						.setPlaceholder('moc')
						.setValue(this.plugin.settings.indexTagValue)
						.onChange(async (value) => {
							this.plugin.settings.indexTagValue = value;
							await this.plugin.saveSettings();
						})
				);
	}
}
