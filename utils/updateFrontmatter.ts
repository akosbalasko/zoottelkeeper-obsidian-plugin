import { FRONTMATTER_SEPARATOR } from '../consts';
import { ZoottelkeeperPluginSettings } from '../interfaces';

export const updateFrontmatter = (settings: ZoottelkeeperPluginSettings, currentContent: string): string => {
    const currentFrontmatter = (currentContent.trim().startsWith(FRONTMATTER_SEPARATOR) && currentContent.split(FRONTMATTER_SEPARATOR).length > 1)
        ? currentContent.split(FRONTMATTER_SEPARATOR)[1]
        : ''
    const tagLine = currentFrontmatter.split('\n').find(elem => elem.split(':')[0]=== settings.indexTagLabel);

    if (!tagLine)
        return currentFrontmatter;

     const taglist = tagLine.split(':')[1];
     const indexTags = settings.indexTagValue.split(settings.indexTagSeparator).map(tag => `[${tag}]`);
     let updatedTaglist = taglist;
     for (const indexTag of indexTags)
        if (!taglist.includes(indexTag))
            updatedTaglist =  updatedTaglist.split(settings.indexTagSeparator).length >0 ? `${updatedTaglist}${settings.indexTagSeparator}${indexTag}`: indexTag;
    
    const updatedTagLine = `tags:${updatedTaglist}`;
    const regex = new RegExp(tagLine.replace(/\[/g,'\\[').replace(/\]/g,'\\]'), 'g');

    return settings.indexTagBoolean 
        ? `${FRONTMATTER_SEPARATOR}${currentFrontmatter.replace(regex,updatedTagLine )}${FRONTMATTER_SEPARATOR}`
        : currentFrontmatter;
    
}