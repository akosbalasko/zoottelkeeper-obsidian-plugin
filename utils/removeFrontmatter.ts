import { FRONTMATTER_SEPARATOR } from '../consts';

export const removeFrontmatter = (content: string): string => {
    return (content.startsWith(FRONTMATTER_SEPARATOR)&& content.split(FRONTMATTER_SEPARATOR).length > 1)
        ? content.split(FRONTMATTER_SEPARATOR)[2]
        : content
}
