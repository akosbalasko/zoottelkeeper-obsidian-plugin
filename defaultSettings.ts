import { SortOrder } from 'models';
import { IndexItemStyle, ZoottelkeeperPluginSettings } from './interfaces'

export const DEFAULT_SETTINGS: ZoottelkeeperPluginSettings = {
	indexFileName: '_Index_of_{{folder_name}}',
	indexItemStyle: IndexItemStyle.PureLink,
	indexTagValue: 'MOC',
	indexTagBoolean: true,
	indexTagSeparator: ', ',
	indexTagLabel: 'tags',
	cleanPathBoolean: true,
	folderEmoji: ':card_index_dividers:',
	fileEmoji: ':page_facing_up:',
	enableEmojis: false,
	hideIndexFile: false,
	foldersExcluded: '',
	foldersIncluded: '',
	sortOrder: SortOrder.ASC,
	addSquareBrackets: true,
	embedSubIndex: false,
	templateFile: '',
	frontMatterSeparator: '---',
};
