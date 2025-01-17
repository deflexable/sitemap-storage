
interface SiteMapStorageConfig {
    /**
     * the absolute path where all sitemaps will be stored
     * 
     * @default process.cwd() + '/sitemaps'
     */
    storageDirectory: string;
    /**
     * domain name for the sitemaps
     */
    hostname: string
}

interface UrlSetData {
    loc: string;
    lastmod?: string | number;
    changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
    priority?: string;
    xhtml_link?: KeyString | KeyString[];
    image?: ImageData | undefined;
    video?: VideoData | undefined;
}

interface ImageData {
    loc: string;
    title?: string
}

interface VideoData {
    title?: string;
    thumbnail_loc?: string;
    description?: string;
    content_loc: string;
}

interface SiteMapIndexData {
    loc: string;
    lastmod: number;
}

type KeyString = { [key: string]: string }

export default class SiteMapStorage {
    constructor(options: SiteMapStorageConfig): void;

    /**
     * creates a new `urlset data`
     * @param data the sitemap data to be written
     * @param path a path to store the sitemap relative to {@link SiteMapStorageConfig.storageDirectory}
     * 
     * @returns the filepath the data was added to
     */
    add(data: UrlSetData, path: string): string;
    /**
     * update an existing `urlset data`
     * @param data the `urlset data` to be merged with the existing data. The `loc` field will be used in finding the appropriate data to be updated
     * @param path a path to store the sitemap relative to {@link SiteMapStorageConfig.storageDirectory}
     * @param createdOn an integer or string-integer value representing the approximate date the existing data was initially created. This is basically used internally for looking up the file to be updated
     * 
     * @returns the filepath where the data was updated
     */
    update(data: UrlSetData, path: string, createdOn: string | number): string
    /**
     * deletes an existing `urlset data`
     * @param data the `urlset data` to be deleted. The `loc` field will be used in finding the appropriate data to be deleted
     * @param path a path to store the sitemap relative to {@link SiteMapStorageConfig.storageDirectory}
     * @param createdOn an integer or string-integer value representing the approximate date the existing data was initially created. This is basically used internally for looking up the file to be removed
     * 
     * @returns the filepath where the data was removed from
     */
    remove(data: UrlSetData, path: string, createdOn: string | number): string;

    getUrlSet(path: string): Promise<UrlSetData[]>;
    getSiteMapIndex(path: string): Promise<SiteMapIndexData[]>;

    prettyUrlSet(path: string, schemas?: KeyString | undefined): Promise<string>;
    prettySiteMapIndex(path: string): Promise<string>;
}