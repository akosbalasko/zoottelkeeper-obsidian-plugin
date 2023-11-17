import { App, Modal, debounce, Plugin, PluginSettingTab, Setting, TFile, TAbstractFile, } from 'obsidian';
import { IndexItemStyle } from './interfaces/IndexItemStyle';
import { GeneralContentOptions, ZoottelkeeperPluginSettings } from './interfaces'
import { isInAllowedFolder, isInDisAllowedFolder, updateFrontmatter, updateIndexContent, removeFrontmatter, hasFrontmatter } from './utils'
import { DEFAULT_SETTINGS } from './defaultSettings';
import * as emoji from 'node-emoji';
import { SortOrder } from 'models';

export default class ZoottelkeeperPlugin extends Plugin {
	settings: ZoottelkeeperPluginSettings;
	lastVault: Set<string>;

	triggerUpdateIndexFile = debounce(
		this.keepTheZooClean.bind(this, false),
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
	async keepTheZooClean(triggeredManually?: boolean) {
		console.debug('keeping the zoo clean...');
		if (this.lastVault || triggeredManually) {
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
					if (indexFilePath
						&& isInAllowedFolder(this.settings, indexFilePath)
						&& !isInDisAllowedFolder(this.settings, indexFilePath)) {
						indexFiles2BUpdated.add(indexFilePath);
					}

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
				
				await this.removeDisallowedFoldersIndexes(indexFiles2BUpdated);
				// update index files
				for (const indexFile of Array.from(indexFiles2BUpdated)) {
					await this.generateIndexContents(indexFile);
				}
				await this.cleanDisallowedFolders();

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

	generateIndexContents = async (indexFile: string): Promise<void> => {
		const templateFile = this.app.vault.getAbstractFileByPath(this.settings.templateFile);
		let currentTemplateContent = '';

		if (templateFile instanceof TFile){
			currentTemplateContent = await this.app.vault.cachedRead(templateFile);
		}	
		
		let indexTFile =
			this.app.vault.getAbstractFileByPath(indexFile) ||
			(await this.app.vault.create(indexFile, currentTemplateContent));

		if (indexTFile && indexTFile instanceof TFile)
			return this.generateIndexContent(indexTFile);
	};

	

	generateGeneralIndexContent = (options: GeneralContentOptions): Array<string> => {
		return options.items
			.reduce(
				(acc, curr) => {
					acc.push(options.func(curr.path, this.isFile(curr)));
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

		try {
			if (indexTFile instanceof TFile){

				let currentContent = await this.app.vault.cachedRead(indexTFile);
				if (currentContent === ''){
					const templateFile = this.app.vault.getAbstractFileByPath(this.settings.templateFile);
			
					if (templateFile instanceof TFile){
						currentContent = await this.app.vault.cachedRead(templateFile);
					}	
				}
				const updatedFrontmatter = hasFrontmatter(currentContent, this.settings.frontMatterSeparator)
				 ? updateFrontmatter(this.settings, currentContent)
				 : '';

				currentContent = removeFrontmatter(currentContent, this.settings.frontMatterSeparator);
				const updatedIndexContent = updateIndexContent(this.settings.sortOrder, currentContent, indexContent);
				await this.app.vault.modify(indexTFile, `${updatedFrontmatter}${updatedIndexContent}`);
			} else {
				throw new Error('Creation index as folder is not supported');
			}
		} catch (e) {
			console.warn('Error during deletion/creation of index files', e);
		}
	};
	setEmojiPrefix = (isFile: boolean): string => {
		return this.settings.enableEmojis 
			? isFile
				? emoji.get(this.settings.fileEmoji)
				: emoji.get(this.settings.folderEmoji)
			: '';

	}

	generateFormattedIndexItem = (path: string, isFile: boolean): string => {
		const realFileName = `${path.split('|')[0]}.md`;
		const fileAbstrPath = this.app.vault.getAbstractFileByPath(realFileName);
		const embedSubIndexCharacter = this.settings.embedSubIndex && this.isIndexFile(fileAbstrPath) ? '!' : '';
		
		switch (this.settings.indexItemStyle) {
			case IndexItemStyle.PureLink:
				return `${this.setEmojiPrefix(isFile)} ${embedSubIndexCharacter}[[${path}]]`;
			case IndexItemStyle.List:
				return `- ${this.setEmojiPrefix(isFile)} ${embedSubIndexCharacter}[[${path}]]`;
			case IndexItemStyle.Checkbox:
				return `- [ ] ${this.setEmojiPrefix(isFile)} ${embedSubIndexCharacter}[[${path}]]`
		};
	}

	generateIndexItem = (path: string, isFile: boolean): string => {
		let internalFormattedIndex;
		if (this.settings.cleanPathBoolean) {
			const cleanPath = ( path.endsWith(".md"))
				? path.replace(/\.md$/,'')
				: path;
			const fileName = cleanPath.split("/").pop();
			internalFormattedIndex = `${cleanPath}|${fileName}`;		
		}
		else {
			internalFormattedIndex = path;
		}
		return this.generateFormattedIndexItem(internalFormattedIndex, isFile);
	}

	generateIndexFolderItem = (path: string, isFile: boolean): string => {
		return this.generateIndexItem(this.getInnerIndexFilePath(path), isFile);
	}

	getInnerIndexFilePath = (folderPath: string): string => {
		const folderName = this.getFolderName(folderPath);
		return this.createIndexFilePath(folderPath, folderName);
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

		return this.createIndexFilePath(parentPath, parentName);
	}

	createIndexFilePath = (folderPath: string, folderName: string) => {
		return `${folderPath}${this.settings.indexPrefix}${folderName}.md`;
	}

	removeDisallowedFoldersIndexes = async (indexFiles: Set<string>): Promise<void> => {
		for (const folder of this.settings.foldersExcluded.split('\n').map(f=> f.trim())){
			const innerIndex = this.getInnerIndexFilePath(folder);
			indexFiles.delete(innerIndex);
		}
	}

	cleanDisallowedFolders = async (): Promise<void> => {
		for (const folder of this.settings.foldersExcluded.split('\n').map(f=> f.trim())){
			const innerIndex = this.getInnerIndexFilePath(folder);
			const indexTFile = this.app.vault.getAbstractFileByPath(innerIndex);
			await this.app.vault.delete(indexTFile);
		}
	}

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
		containerEl.createEl('h3', { text: 'Folder Settings' });
		
		new Setting(containerEl)
			.setName('Folders included')
			.setDesc(
				'Specify the folders to be handled by Zoottelkeeper. They must be absolute paths starting from the root vault, one per line, example: Notes/ <enter> Articles/, which will include Notes and Articles folder in the root folder. Empty list means all of the vault will be handled except the excluded folders. \'*\' can be added to the end, to include the folder\'s subdirectories recursively, e.g. Notes/* <enter> Articles/'
			)
			.addTextArea((text) =>
				text
					.setPlaceholder('')
					.setValue(this.plugin.settings.foldersIncluded)
					.onChange(async (value) => {
						this.plugin.settings.foldersIncluded = value
							.replace(/,/g,'\n')
							.split('\n')
							.map(
								folder=> {
									const f = folder.trim();
									return f.startsWith('/')
										? f.substring(1)
										: f
								})
							.join('\n');
						await this.plugin.saveSettings();
					})
			);
		new Setting(containerEl)
			.setName('Folders excluded')
			.setDesc(
				'Specify the folders NOT to be handled by Zoottelkeeper. They must be absolute paths starting from the root vault, one per line, an empty line or "/" excluding the root folder itself. Example:  "Notes/ <enter>  Articles/ ", it will exclude Notes and Articles folder in the root folder. * can be added to the end, to exclude the folder\'s subdirectories recursively.'
			)
			.addTextArea((text) =>
				text
					.setPlaceholder('')
					.setValue(this.plugin.settings.foldersExcluded)
					.onChange(async (value) => {
						this.plugin.settings.foldersExcluded = value
							.replace(/,/g,'\n')
							.split('\n')
							.map(
								folder=> {
									const f = folder.trim();
									return f.startsWith('/')
										? f.substring(1)
										: f
								})
							.join('\n');;
						await this.plugin.saveSettings();
					})
			);
		new Setting(containerEl)
			.setName('Trigger indexing')
			.setDesc(
				'By pushing this button you can trigger the indexing on folders match your include/exclude criterias currently set.'
			)
			.addButton((btn) => {
					btn.setButtonText('Generate index now')
					btn.onClick(async () => {
						this.plugin.lastVault = new Set();
						await this.plugin.keepTheZooClean(true);
					})
				}
			);


		containerEl.createEl('h3', { text: 'General Settings' });
		new Setting(containerEl)
			.setName("Clean Files")
			.setDesc(
				"This enables you to only show the files without path and '.md' ending in preview mode."
			)
			.addToggle((t) => {
				t.setValue(this.plugin.settings.cleanPathBoolean);
				t.onChange(async (v) => {
					this.plugin.settings.cleanPathBoolean = v;
					await this.plugin.saveSettings();
				});
			});
		new Setting(containerEl)
			.setName('Index links Order')
			.setDesc('Select the order of the links to be sorted in the index files.')
			.addDropdown(async (dropdown) => {
				dropdown.addOption(SortOrder.ASC, 'Ascending');
				dropdown.addOption(SortOrder.DESC, 'Descending');

				dropdown.setValue(this.plugin.settings.sortOrder);
				dropdown.onChange(async (option) => {
					this.plugin.settings.sortOrder = option as SortOrder;
					await this.plugin.saveSettings();
				});
			});

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
		new Setting(containerEl)
			.setName('Embed sub-index content in preview')
			.setDesc(
				"If you enable this, the plugin will embed the sub-index content in preview mode."
			)
			.addToggle((t) => {
				t.setValue(this.plugin.settings.embedSubIndex);
				t.onChange(async (v) => {
					this.plugin.settings.embedSubIndex = v;
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
		new Setting(containerEl)
			.setName('Template file')
			.setDesc(
				'Set your template file\'s absolute path like "templates/zoottel_template.md"'
			)
			.addText((text) =>
				text
					.setPlaceholder('')
					.setValue(this.plugin.settings.templateFile)
					.onChange(async (value) => {
						console.debug('Template file: ' + value);
						this.plugin.settings.templateFile = value;
						await this.plugin.saveSettings();
					})
			);
		new Setting(containerEl)
			.setName('Frontmatter separator')
			.setDesc('It specifies the separator string generated before and after the frontmatter, by default its ---')
			.addText((text) =>
				text
					.setPlaceholder('')
					.setValue(this.plugin.settings.frontMatterSeparator)
					.onChange(async (value) => {
						this.plugin.settings.frontMatterSeparator = value;
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
		const metaTagsSetting = new Setting(containerEl)
			.setName('Set Meta Tags')
			.setDesc(
				'You can add one or multiple tags to your index-files! There is no need to use "#", just use the exact value of the tags\' separator specified below between the tags.'
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
		new Setting(containerEl)
			.setName('Set the tag\'s label in frontmatter')
			.setDesc(
				'Please specify the label of the tags in frontmatter (the text before the colon ):'
			)
			.addText((text) =>
				text
					.setPlaceholder('tags')
					.setValue(this.plugin.settings.indexTagLabel)
					.onChange(async (value) => {
						this.plugin.settings.indexTagLabel = value;
						await this.plugin.saveSettings();
					})
			);
		new Setting(containerEl)
			.setName('Set the tag\'s separator in Frontmatter')
			.setDesc(
				'Please specify the separator characters that distinguish the tags in Frontmatter:'
			)
			.addText((text) =>
				text
					.setPlaceholder(', ')
					.setValue(this.plugin.settings.indexTagSeparator)
					.onChange(async (value) => {
						this.plugin.settings.indexTagSeparator = value;
						await this.plugin.saveSettings();
					})
			);
		new Setting(containerEl)
			.setName('Add square brackets around each tags')
			.setDesc(
				"If you enable this, the plugin will put square brackets around the tags set."
			)
			.addToggle((t) => {
				t.setValue(this.plugin.settings.addSquareBrackets);
				t.onChange(async (v) => {
					this.plugin.settings.addSquareBrackets = v;
					await this.plugin.saveSettings();
				});
			});
			containerEl.createEl('h4', { text: 'Emojis' });

			// Enabling Meta Tags
			new Setting(containerEl)
				.setName('Enable Emojis')
				.setDesc("You can set an emoji at the beginning of each index item depending on its type (file or folder). If multiple emojis matches, the first one will be stored."
				)
				.addToggle((t) => {
					t.setValue(this.plugin.settings.enableEmojis);
					t.onChange(async (v) => {
						this.plugin.settings.enableEmojis = v;
						await this.plugin.saveSettings();
					});
				});


			let emojiFolderDesc = 'Set an emoji for folders:'
			if (this.plugin.settings.folderEmoji){
				const setFolderEmoji = emoji.search(this.plugin.settings.folderEmoji);
				emojiFolderDesc = `Matching Options:${setFolderEmoji[0].emoji} (${setFolderEmoji[0].key})`;
			}
			const emojiForFoldersSetting = new Setting(containerEl)
				.setName('Emojis')
				.setDesc(emojiFolderDesc)
				.addText((text) =>
					text.setPlaceholder('card_index_dividers')
						.setValue(this.plugin.settings.folderEmoji.replace(/:/g, ''))
						.onChange(async (value) => {
							if (value !== ''){
								const emojiOptions = emoji.search(value);
								emojiForFoldersSetting.setDesc(`Matching Options:${emojiOptions.map(emojOp => emojOp.emoji + "("+emojOp.key+")")}`)
								if (emojiOptions.length > 0){
									this.plugin.settings.folderEmoji = `:${emojiOptions[0].key}:`;
									await this.plugin.saveSettings();
								}
							} else {
								emojiForFoldersSetting.setDesc(
									'Set an emoji for folders:'
								)
							}
					}));
				let emojiFileDesc = 'Set an emoji for files:'
				if (this.plugin.settings.fileEmoji){
					const setFileEmoji = emoji.search(this.plugin.settings.fileEmoji);
					emojiFileDesc = `Matching Options:${setFileEmoji[0].emoji} (${setFileEmoji[0].key})`;
				}
					
				const emojiForFilesSetting = new Setting(containerEl)
					.setName('Emojis')
					.setDesc(emojiFileDesc)
					.addText((text) =>
						text.setPlaceholder('page_facing_up')
							.setValue(this.plugin.settings.fileEmoji.replace(/:/g, ''))
							.onChange(async (value) => {
								if (value !== ''){
									const emojiOptions = emoji.search(value);
									emojiForFilesSetting.setDesc(`Matching Options:${emojiOptions.map(emojOp => emojOp.emoji + "("+emojOp.key+")")}`)
									if (emojiOptions.length > 0){
										this.plugin.settings.fileEmoji = `:${emojiOptions[0].key}:`;
										await this.plugin.saveSettings();
									}
								} else {
									emojiForFilesSetting.setDesc(
										'Set an emoji for files:'
									)
								}
						})
			);
				
	}
}
