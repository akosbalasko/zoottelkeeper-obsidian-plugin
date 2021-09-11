
import { FRONTMATTER_SEPARATOR } from '../consts';

export const hasFrontmatter = (content: string): boolean => {
    return (content.trim().startsWith(FRONTMATTER_SEPARATOR) && content.split(FRONTMATTER_SEPARATOR).length > 1);
}