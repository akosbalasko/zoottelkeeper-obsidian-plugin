import { SortOrder } from './../models';
import { IndexItemStyle } from './IndexItemStyle';
import { IndexLinkStyle } from './IndexLinkStyle';

export interface ZoottelkeeperPluginSettings {
    indexPrefix: string;
    indexItemStyle: IndexItemStyle;
    indexLinkStyle: IndexLinkStyle;
    indexTagValue: string;
    indexTagBoolean: boolean;
    indexTagLabel: string;
    cleanPathBoolean: boolean;
    indexTagSeparator: string;
    folderEmoji: string;
    fileEmoji: string;
    enableEmojis: boolean;
    foldersIncluded: string;
    foldersExcluded: string;
    sortOrder: SortOrder;
    addSquareBrackets: boolean;
    embedSubIndex: boolean;
    templateFile: string;
    frontMatterSeparator: string;
    [key: string]: any;

}
