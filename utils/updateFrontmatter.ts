import { ZoottelkeeperPluginSettings } from '../interfaces';
import { getFrontmatter } from './getFrontmatter'; 

export const updateFrontmatter = (settings: ZoottelkeeperPluginSettings, currentContent: string): string => {


    if (!settings.indexTagBoolean)
        return getFrontmatter(currentContent, settings.frontMatterSeparator);
    
    let currentFrontmatterWithoutSep = `${currentContent.split(settings.frontMatterSeparator)[1]}`;
    
    if (currentFrontmatterWithoutSep === '')
        return ''
    else {
        let tagLine = currentFrontmatterWithoutSep.split('\n').find(elem => elem.split(':')[0]=== settings.indexTagLabel);
        if (!tagLine && settings.indexTagValue && settings.indexTagBoolean){
            tagLine = 'tags:';
            currentFrontmatterWithoutSep = `${currentFrontmatterWithoutSep}${tagLine}\n`;
        }

        const taglist = tagLine.split(':')[1].trim();
        const indexTags = settings.indexTagSeparator
            ? settings.indexTagValue.split(settings.indexTagSeparator) 
            : [settings.indexTagValue];

        let updatedTaglist = taglist.replace(/\[|\]/g,'')
        for (const indexTag of indexTags) {
            if (!taglist.includes(indexTag)) {
                updatedTaglist =  !settings.indexTagSeparator 
                || (updatedTaglist.split(settings.indexTagSeparator).length >= 1 
                    && updatedTaglist.split(settings.indexTagSeparator)[0]!== '')
                    ? `${updatedTaglist}${settings.indexTagSeparator}${indexTag}`
                    : indexTag;
            }
        }
        if (settings.addSquareBrackets)
            updatedTaglist = `[${updatedTaglist}]`;
        const updatedTagLine = `tags: ${updatedTaglist}`;
        const regex = new RegExp(tagLine.replace(/\[/g,'\\[').replace(/\]/g,'\\]'), 'g');

        return settings.indexTagBoolean
            ? `${settings.frontMatterSeparator}${currentFrontmatterWithoutSep.replace(regex,updatedTagLine )}${settings.frontMatterSeparator}`
            : `${settings.frontMatterSeparator}${currentFrontmatterWithoutSep}${settings.frontMatterSeparator}`;
    }
}