# sitemap-storage

Efficiently store and deliver the sitemap to your web pages
This library automatically helps in archiving sitemap records that exceed 45,000 urlsets or filesize of 45MB
This library does not store sitemap record on the system's memory

## Installation

```sh
npm install sitemap-storage --save
```

or using yarn

```sh
yarn add sitemap-storage
```

## Usage

```js
const SiteMapStorage = require("sitemap-storage");

const sitemap = new SiteMapStorage({
  hostname: "https://example.com",
  storageDirectory: "/absolute/path/to/sitemaps",
});

// adding a basic urlset data
sitemap.add(
  {
    changefreq: "always",
    loc: "/community/the-advancement-in-ai", // can also be an http link
    lastmod: Date.now(),
    priority: "0.9",
  },
  "./community" // <--- the directory to store the sitemap records in
);

// adding a more advance urlset data
sitemap.add(
  {
    changefreq: "weekly",
    loc: "https://example.com/posts/importance-of-large-scale-farming",
    lastmod: Date.now(),
    priority: "0.7",
    xhtml_link: [
      { rel: "alternate", hreflang: "fr", href: "/posts/importance-of-large-scale-farming?lang=fr" },
      { rel: "alternate", hreflang: "ko", href: "/posts/importance-of-large-scale-farming?lang=ko" },
      // ...more
    ],
    image: { loc: "path/to/image.jpg", title: "Testing Image Alt" },
    video: {
      content_loc: "path/to/playable/video.mp4",
      description: "Testing Video Description",
      thumbnail_loc: "/path/to/video/thumbnail.png",
      title: "Testing Video Title",
    }
  },
  "./posts"
);

// this should output an xml string

console.log(urlsetString);
```

## Print sitemapindex

```js
const SiteMapStorage = require("sitemap-storage");

const sitemap = new SiteMapStorage({
  hostname: "https://example2.com", // we can change the hostname to prefill the `loc` path
  storageDirectory: "/absolute/path/to/sitemaps",
});

sitemap.prettyUrlSet('./posts').then(result => {
    // will output something like this:

    // <sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

    //     <sitemap>
    //         <loc>https://example2.com/posts/1737117519084</loc>
    //         <lastmod>2025-01-17</lastmod>
    //     </sitemap>

    // </sitemapindex>

    console.log(result);
}); 
```

## Print UrlSet Data

```js
const SiteMapStorage = require("sitemap-storage");

const sitemap = new SiteMapStorage({
  hostname: "https://example2.com", // we can change the hostname to prefill `href` and `loc` path
  storageDirectory: "/absolute/path/to/sitemaps",
});

const urlsetSchemas = {
    'xmlns:xhtml': 'http://www.w3.org/1999/xhtml',
    'xmlns:image': 'http://www.google.com/schemas/sitemap-image/1.1'
};

sitemap.prettyUrlSet('./posts/1737117519084', urlsetSchemas)
  .then(urlsetString => {
    // will output something like this:
    
    // <?xml version="1.0" encoding="UTF-8"?>
    // <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
    //         xmlns:xhtml="http://www.w3.org/1999/xhtml"
    //         xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
    // 
    //   <url>
    //     <loc>https://example.com/posts/importance-of-large-scale-farming</loc>
    //     <lastmod>2025-01-17</lastmod>
    //     <changefreq>weekly</changefreq>
    //     <priority>0.7</priority>
    //     <xhtml:link rel="alternate" hreflang="fr" href="https://example2.com/posts/importance-of-large-scale-farming%3Flang=fr" />
    //     <xhtml:link rel="alternate" hreflang="ko" href="https://example2.com/posts/importance-of-large-scale-farming%3Flang=ko" />
    //     <image:image>
    //       <image:loc>https://example2.com/path/to/image.jpg</image:loc>
    //       <image:title>Testing Image Alt</image:title>
    //     </image:image>
    //     <video:video>
    //       <video:loc>path/to/image.jpg</video:loc>
    //       <video:title>Testing Image Alt</video:title>
    //     </video:video>
    //   </url>

    // </urlset>
    console.log(urlsetString);
});
```