import { SortOrder } from 'models';
import { IndexItemStyle, ZoottelkeeperPluginSettings } from './interfaces'

export const DEFAULT_SETTINGS: ZoottelkeeperPluginSettings = {
	indexPrefix: '_Index_of_',
	indexItemStyle: IndexItemStyle.PureLink,
	indexTagValue: 'MOC',
	indexTagBoolean: true,
	indexTagSeparator: ', ',
	indexTagLabel: 'tags',
	cleanPathBoolean: true,
	folderEmoji: ':card_index_dividers:',
	fileEmoji: ':page_facing_up:',
	enableEmojis: false,
	foldersExcluded: '',
	foldersIncluded: '',
	sortOrder: SortOrder.ASC,
	addSquareBrackets: true,
	embedSubIndex: false,
	templateFile: '',
};
