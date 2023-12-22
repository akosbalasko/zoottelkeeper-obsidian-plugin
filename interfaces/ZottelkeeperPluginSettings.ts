import { SortOrder } from './../models';
import { IndexItemStyle } from './IndexItemStyle';

export interface ZoottelkeeperPluginSettings {
	indexFileName: string;
	indexItemStyle: IndexItemStyle;
	indexTagValue: string;
	indexTagBoolean: boolean;
	indexTagLabel: string;
	cleanPathBoolean: boolean;
	indexTagSeparator: string;
	folderEmoji: string;
	fileEmoji: string;
	enableEmojis: boolean;
	hideIndexFile: boolean;
	foldersIncluded: string;
	foldersExcluded: string;
  	sortOrder: SortOrder;
	addSquareBrackets: boolean;
	embedSubIndex: boolean;
	templateFile: string;
	frontMatterSeparator: string;
    [key: string]: any;

}