import { FRONTMATTER_SEPARATOR } from '../consts';

export const removeFrontmatter = (content: string): string => {
    return (content.startsWith(FRONTMATTER_SEPARATOR)&& content.split(FRONTMATTER_SEPARATOR).length > 1)
        ? content.split(FRONTMATTER_SEPARATOR).slice(2).join(FRONTMATTER_SEPARATOR)
        : content
}
