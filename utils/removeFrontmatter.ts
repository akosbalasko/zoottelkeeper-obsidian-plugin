export const removeFrontmatter = (content: string, separator: string): string => {
    return (content.startsWith(separator)&& content.split(separator).length > 1)
        ? content.split(separator).slice(2).join(separator)
        : content
}
