
import { TAbstractFile, } from 'obsidian';

export interface GeneralContentOptions {
	items: Array<TAbstractFile>;
	initValue: Array<string>;
	func: Function;
}