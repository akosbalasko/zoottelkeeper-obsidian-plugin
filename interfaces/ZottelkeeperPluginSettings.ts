import { SortOrder } from './../models';
import { IndexItemStyle } from './IndexItemStyle';

export interface ZoottelkeeperPluginSettings {
	indexPrefix: string;
	indexItemStyle: IndexItemStyle;
	indexTagValue: string;
	indexTagBoolean: boolean;
	indexTagLabel: string;
	cleanPathBoolean: boolean;
	indexTagSeparator: string;
	foldersIncluded: string;
	foldersExcluded: string;
  sortOrder: SortOrder;
	addSquareBrackets: boolean;
	embedSubIndex: boolean;
  [key: string]: any;

}