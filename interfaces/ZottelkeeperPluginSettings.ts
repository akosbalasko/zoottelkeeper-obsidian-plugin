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
	sortOrder: SortOrder;
}