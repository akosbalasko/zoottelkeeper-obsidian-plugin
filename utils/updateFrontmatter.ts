import { FRONTMATTER_SEPARATOR } from '../consts';
import { ZoottelkeeperPluginSettings } from '../interfaces';

export const updateFrontmatter = (settings: ZoottelkeeperPluginSettings, currentContent: string): string => {
    const currentFrontmatter = (currentContent.startsWith(FRONTMATTER_SEPARATOR) && currentContent.split(FRONTMATTER_SEPARATOR).length > 1)
        ? currentContent.split(FRONTMATTER_SEPARATOR)[1]
        : ''
    const tagLine = currentFrontmatter.split('\n').find(elem => elem.split(':')[0]=== 'tags');

    if (!tagLine)
        return currentFrontmatter;

     const taglist = tagLine.split(':')[1];
     const indexTag = `[${settings.indexTagValue}]`;
     let updatedTaglist = taglist;
    if (!taglist.includes(indexTag))
        updatedTaglist =  taglist.split(settings.indexTagSeparator).length >0 ? `${taglist}${settings.indexTagSeparator}${indexTag}`: indexTag;
    const updatedTagLine = `tags:${updatedTaglist}`;
    const regex = new RegExp(tagLine, 'g');

    return settings.indexTagBoolean 
        ? `${FRONTMATTER_SEPARATOR}${currentFrontmatter.replace(regex,updatedTagLine )}${FRONTMATTER_SEPARATOR}`
        : currentFrontmatter;
    
}