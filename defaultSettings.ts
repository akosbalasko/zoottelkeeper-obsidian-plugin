import { IndexItemStyle, ZoottelkeeperPluginSettings } from './interfaces'

export const DEFAULT_SETTINGS: ZoottelkeeperPluginSettings = {
	indexPrefix: '_Index_of_',
	indexItemStyle: IndexItemStyle.PureLink,
	indexTagValue: 'MOC',
	indexTagBoolean: true,
	indexTagSeparator: ', ',
	indexTagLabel: 'tags',
	cleanPathBoolean: true,
	foldersExcluded: '',
	foldersIncluded: ''
};
