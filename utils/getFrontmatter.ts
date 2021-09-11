import { FRONTMATTER_SEPARATOR } from '../consts';
import { hasFrontmatter } from './hasFrontmatter';

export const getFrontmatter = (content: string): string => {
    return hasFrontmatter(content)
        ? `${FRONTMATTER_SEPARATOR}${content.split(FRONTMATTER_SEPARATOR)[1]}${FRONTMATTER_SEPARATOR}`
        : ''
}