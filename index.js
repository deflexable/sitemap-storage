const { join, resolve } = require("path");
const { appendFile, mkdir, readdir, readFile, writeFile } = require('fs/promises');
const { promises } = require("fs");
const { Scope } = require("./scope.js");

const MAX_COUNTS = 45_000;
const MAX_BYTES = 1024 * 1024 * 40; // 40M

function getCharacterByteSize(char) {
    const charCode = char.codePointAt(0);

    if (charCode <= 0x7F) {
        // 1 byte: ASCII characters
        return 1;
    } else if (charCode <= 0x7FF) {
        // 2 bytes: Characters from U+0080 to U+07FF
        return 2;
    } else if (charCode <= 0xFFFF) {
        // 3 bytes: Characters from U+0800 to U+FFFF
        return 3;
    } else if (charCode <= 0x10FFFF) {
        // 4 bytes: Supplementary characters (surrogate pairs)
        return 4;
    }
    return 5;
};

const calculateTextByteSize = (text = '') => {
    let totalBytes = 0;

    text.split('').forEach(e => {
        totalBytes += getCharacterByteSize(e);
    });
    return totalBytes;
}

const initCate = async (directory) => {
    if (!Scope.sitemapDirectory[directory]) {
        try {
            await mkdir(directory, { recursive: true });
        } catch (_) { }
        const list = await readdir(directory);
        Scope.sitemapDirectory[directory] = { dirs: list.map(v => v * 1).sort().reverse(), tipBytes: 0, tipCounts: 0 };
        const tipPath = Scope.sitemapDirectory[directory].dirs[0];
        if (tipPath) {
            const data = await readFile(join(directory, `${tipPath}`), { encoding: 'utf8' });
            Scope.sitemapDirectory[directory].tipBytes = calculateTextByteSize(data);
            Scope.sitemapDirectory[directory].tipCounts = data.split('\n').filter(v => v).length;
        } else Scope.sitemapDirectory[directory].dirs.push(Date.now() - 3);
    }
}

const addSitemapURL = (data, directory) => {
    validateUrlSetData(data);
    const pendingPromise = Scope.chainedPromises[directory];

    Scope.chainedPromises[directory] = new Promise(async (resolve, reject) => {
        try {
            try {
                if (pendingPromise) await pendingPromise;
            } catch (_) { }

            await initCate(directory);
            const { dirs, tipBytes, tipCounts } = Scope.sitemapDirectory[directory];
            const newContent = `\n${encodeURIComponent(JSON.stringify(data))}`;

            if (tipBytes >= MAX_BYTES || tipCounts >= MAX_COUNTS) {
                Scope.sitemapDirectory[directory].dirs.splice(0, 0, Date.now() - 3);
                Scope.sitemapDirectory[directory].tipBytes = 0;
                Scope.sitemapDirectory[directory].tipCounts = 0;
            }
            const filePath = join(directory, `${dirs[0]}`);
            await appendFile(
                filePath,
                newContent,
                { encoding: 'utf8' }
            );
            Scope.sitemapDirectory[directory].tipBytes += calculateTextByteSize(newContent);;
            ++Scope.sitemapDirectory[directory].tipCounts;
            resolve(filePath);
        } catch (error) {
            reject(error);
        }
    });
    return Scope.chainedPromises[directory];
};

const updateSitemap = (data, directory, dateCursor, remove) => {
    validateUrlSetData(data);
    if (!Number.isInteger(dateCursor = parseInt(dateCursor)))
        throw `index should be a integer or integer-string but got ${dateCursor}`;

    const pendingPromise = Scope.chainedPromises[directory];

    Scope.chainedPromises[directory] = new Promise(async (resolve, reject) => {
        try {
            try {
                if (pendingPromise) await pendingPromise;
            } catch (_) { }

            await initCate(directory);
            const nearestDir = Scope.sitemapDirectory[directory].dirs.find((v, i, a) =>
                (!i || i === a.length - 1) ? v <= dateCursor
                    : (a[i - 1] >= dateCursor && a[i + 1] <= dateCursor)
            );

            if (nearestDir) {
                const filePath = join(directory, `${nearestDir}`);
                let wasUpdated;

                const currentData = await readFile(filePath, { encoding: 'utf8' });
                const changedData = currentData.split('\n').filter(v => v).map(v => {
                    const thisData = JSON.parse(decodeURIComponent(v));

                    if (thisData.loc === data.loc) {
                        wasUpdated = true;
                        return remove ? null : encodeURIComponent(JSON.stringify({ ...thisData, ...data }));
                    }
                    return v;
                }).filter(v => v);

                if (wasUpdated) {
                    const newContent = changedData.join('\n');
                    Scope.sitemapDirectory[directory].tipBytes = calculateTextByteSize(newContent);
                    Scope.sitemapDirectory[directory].tipCounts = changedData.length;
                    await writeFile(filePath, newContent, { encoding: 'utf8' });
                    resolve(filePath);
                } else throw 'No urlset data found';
            } else throw 'No site map records found';
        } catch (error) {
            reject(error);
        }
    });

    return Scope.chainedPromises[directory];
};

const changefreq_list = [
    'always',
    'hourly',
    'daily',
    'weekly',
    'monthly',
    'yearly',
    'never'
];

const isNumber = a => typeof a === 'number' && !isNaN(a) && Number.isFinite(a);

function isObject(o) {
    if (typeof o !== 'object' || o === null) return false;
    return Object.prototype.toString.call(o) === '[object Object]'
        && Object.getPrototypeOf(o) === Object.prototype;
}

const isNameSpaceValid = d => isObject(d) && !Object.entries(d).some(v => typeof v[1] !== 'string');

const validateUrlSetData = (data) => {
    if (!isObject(data)) throw `expected an object but got ${data}`;
    if (!('loc' in data)) throw 'loc is required';

    Object.entries(data).forEach(([key, value]) => {
        if (['loc', 'lastmod', 'changefreq', 'priority'].includes(key)) {
            if (typeof value !== 'string') {
                if (key === 'lastmod') {
                    if (new Date(value).toString() === 'Invalid Date')
                        throw 'invalid date value supplied to lastmod';
                } else throw `${key} must of type string but instead got ${value}`;
            }
            if (
                key === 'changefreq' &&
                !changefreq_list.includes(value)
            ) throw `invalid value "${value}",changefreq must be any of ${changefreq_list}`;
            if (key === 'priority') {
                const priorityNum = parseFloat(value);
                if (
                    !isNumber(priorityNum) ||
                    value[1] !== '.' ||
                    priorityNum > 1.0 ||
                    priorityNum < 0.0
                ) throw `priority must range from 0.0 to 1.0 but got ${value}`;
            }
        } else if (['xhtml_link', 'image', 'video', 'news'].includes(key)) {
            const checkNest = (obj, dex) => {
                (Array.isArray(obj) ? obj : [obj]).forEach(v => {
                    if (key === 'news' && !dex && isObject(v)) {
                        Object.entries(v).forEach(([n, m]) => {
                            checkNest(isObject(m) ? m : { [n]: m }, dex + 1);
                        });
                    } else if (!isNameSpaceValid(v))
                        throw `invalid value supplied to ${key} of ${v}`;
                });
            }
            checkNest(value, 0);
        } else if (key === 'mobile') {
            if (typeof value !== 'boolean') throw 'mobile field should have a boolean value';
        } else throw `unknown property "${key}"`;
    });
}

const isLinkValid = v => /(\b(https):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig.test(v) ||
    /(\b(http):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig.test(v);

const getModDate = (time) => {
    const dateObj = new Date(time);
    const two0s = t => {
        t = `${t}`;
        return t.length === 1 ? `0${t}` : t;
    }
    return `${dateObj.getFullYear()}-${two0s(dateObj.getMonth() + 1)}-${two0s(dateObj.getDate())}`;
}

const transformLink = (link, hostname) => {
    if (isLinkValid(link)) {
        return link;
    } else {
        const url = new URL(hostname);
        url.pathname = link;
        return url.href;
    }
}

class SiteMapStorage {
    constructor(options) {
        const { storageDirectory: cwd, hostname } = options || {};
        if (cwd !== undefined && typeof cwd !== 'string')
            throw `expected storageDirectory to be a string but got ${cwd}`;
        if (typeof hostname !== 'string' || !isLinkValid(hostname))
            throw `hostname must be a valid http or https link`;

        this.options = {
            cwd: cwd || join(process.cwd(), 'sitemaps'),
            hostname
        };
    }

    add(data, path) {
        const dir = resolve(this.options.cwd, path);
        return addSitemapURL(data, dir);
    }

    update(data, path, index) {
        const dir = resolve(this.options.cwd, path);
        return updateSitemap(data, dir, index);
    }

    remove(data, path, index) {
        const dir = resolve(this.options.cwd, path);
        return updateSitemap(data, dir, index, true);
    }

    async getUrlSet(path) {
        const filePath = resolve(this.options.cwd, path);
        const content = (
            await readFile(filePath, { encoding: 'utf8' })
        ).split('\n').map(v => {
            if (!v) return null;
            const parseData = JSON.parse(decodeURIComponent(v));
            validateUrlSetData(parseData);
            return parseData;
        }).filter(v => v);

        return content;
    }

    async getSiteMapIndex(path) {
        const dir = resolve(this.options.cwd, path);
        const content = await Promise.all(
            (await readdir(dir)).map(async v => {
                const dest = join(dir, v);
                const info = await promises.stat(dest);
                if (info.isFile()) {
                    return {
                        loc: v,
                        lastmod: info.mtime.getTime()
                    };
                }
            })
        );

        return content.filter(v => v);
    }

    async prettyUrlSet(path, schemas) {
        const { hostname } = this.options;
        const urlsetData = await this.getUrlSet(path);

        if (schemas && !isNameSpaceValid(schemas))
            throw 'invalid urlset schemas';

        const renderItem = (d) => {
            return `
  <url>
    <loc>${transformLink(d.loc, hostname)}</loc>${d.lastmod ? `
    <lastmod>${getModDate(d.lastmod)}</lastmod>` : ''}${d.changefreq ? `
    <changefreq>${d.changefreq}</changefreq>` : ''}${d.priority ? `
    <priority>${d.priority}</priority>` : ''}${d.xhtml_link ? (Array.isArray(d.xhtml_link) ? d.xhtml_link : [d.xhtml_link]).map(x => `
    <xhtml:link ${Object.entries(x).map(([k, r]) => {
                if (k === 'href') r = transformLink(r, hostname);
                return `${k}="${r}"`;
            }).join(' ')} />`).join('') : ''}${d.image ? `
    <image:image>
      ${Object.entries(d.image).map(([k, v]) => {
                if (k === 'loc') v = transformLink(v, hostname);
                return `
      <image:${k}>${v}</image:${k}>`;
            }).join('').trimStart()}
    </image:image>` : ''}${d.video ? `
    <video:video>
      ${Object.entries(d.image).map(([k, v]) => {
                if (['thumbnail_loc', 'content_loc'].includes(k)) v = transformLink(v, hostname);
                return `
      <video:${k}>${v}</video:${k}>`;
            }).join('').trimStart()}
    </video:video>` : ''}${d.mobile ? `
    <mobile:mobile />` : ''}
  </url>
`;
        };

        const blob = `
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${schemas ? Object.entries(schemas).map(([k, v]) => k === 'xmlns' ? '' : `
        ${k}="${v}"`).join('') : ''}>
${urlsetData.map(v => renderItem(v)).join('')}
</urlset>
`;

        return blob.trim();
    }

    async prettySiteMapIndex(path) {
        const indexList = await this.getSiteMapIndex(path);
        const renderItem = (d) => {
            const url = new URL(this.options.hostname);
            url.pathname = join(path, d.loc);

            return `
    <sitemap>
        <loc>${url.href}</loc>${d.lastmod ? `
        <lastmod>${getModDate(d.lastmod)}</lastmod>` : ''}
    </sitemap>
`;
        };

        const blob = `
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${indexList.map(v => renderItem(v)).join('')}
</sitemapindex>
`;
        return blob.trim();
    }
};

module.exports = SiteMapStorage;