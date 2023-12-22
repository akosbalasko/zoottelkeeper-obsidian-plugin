
import { TAbstractFile, WorkspaceLeaf, View } from 'obsidian';

export interface GeneralContentOptions {
	items: Array<TAbstractFile>;
	initValue: Array<string>;
	func: Function;
}

export interface FileExplorerWorkspaceLeaf extends WorkspaceLeaf {
	containerEl: HTMLElement;
	view: FileExplorerView;
}

interface FileExplorerViewFileItem extends TAbstractFile {
	titleEl: HTMLElement
	selfEl: HTMLElement
}

interface FileExplorerView extends View {
	fileItems: { [path: string]: FileExplorerViewFileItem };
}