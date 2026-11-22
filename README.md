![eyecatch image](https://user-images.githubusercontent.com/9818101/79817116-a943b380-83bf-11ea-9e7a-6d59ba75f5a6.png "Art by kuropapu")

## Used Technologies
* [Parcel](https://parceljs.org) for build / optimize asset
* [Stylus](https://stylus-lang.com) for CSS preprocessor
* [Pug](https://pugjs.org) for HTML preprocessor
* [Vercel](https://vercel.com) for origin / edge CDN
* [Shrink Me](https://shrinkme.app) for optimize image
* [WebP Converter](https://webp-converter.com) for webp converter
* [brumm.af/shadows](https://brumm.af/shadows) for calculate layered shadow
* [Transfonter](https://transfonter.org) for generate woff2 font
* [Google Fonts](https://fonts.google.com) for font subset
* [Can I use...](https://caniuse.com) for browser support check
* [Visual Studio Code](https://code.visualstudio.com) for code editor
* [GitKraken](https://www.gitkraken.com) for git client
* [web.dev](https://web.dev/measure) for measure performance
* [badgen](https://flat.badgen.net) for readme badge
* Me for code
* You for visit

## CSS art
`src/_pug/icon.pug`(アバター)と `src/_pug/header.pug`(拡大表示)は、1px高の `linear-gradient` を縦に並べたCSSアートです。
元データは写真由来のノイズで巨大になりがちなので、`scripts/optimize-css-art.mjs` で軽量化しています
(各行の色を、許容誤差つきの折れ線で近似。`linear-gradient` が停止点の間を補間します)。

```sh
npm run optimize:art -- src/_pug/header.pug                # 許容誤差 4(既定)
npm run optimize:art -- src/_pug/icon.pug --width=400      # style に width が無い場合は --width が必要
npm run optimize:art -- in.pug out.pug --tolerance=2       # 高精度寄り
```

## Deploy files
`static/` の中身(`_headers`、`_routes.json`)は、ビルド時に `dist/` 直下へコピーされます。
