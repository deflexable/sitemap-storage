

const Scope = {
    /**
     * @type {{[key: string]: {dirs: string[], tipBytes: number, tipCounts: number}}}
     */
    sitemapDirectory: {},
    /**
     * @type {{[key: string]: Promise<any>}}
     */
    chainedPromises: {}
};

module.exports = { Scope };