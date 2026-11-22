![eyecatch image](https://user-images.githubusercontent.com/9818101/79817116-a943b380-83bf-11ea-9e7a-6d59ba75f5a6.png "Art by kuropapu")

## Used Technologies
* [Parcel](https://parceljs.org) for build / optimize asset
* [Stylus](https://stylus-lang.com) for CSS preprocessor
* [Pug](https://pugjs.org) for HTML preprocessor
* [Cloudflare Pages](https://pages.cloudflare.com) for hosting / edge CDN / Functions
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
`src/_pug/icon.pug`(アバター)と `src/image/header.svg`(拡大表示)は、1px高の `linear-gradient` を縦に並べたCSSアートです。
拡大表示のほうは4MBあるので、SVGの `foreignObject` に入れてモーダルの背景画像にし、モーダルを開くまで取得しないようにしています。
元データは写真由来のノイズで巨大になりがちなので、`scripts/optimize-css-art.mjs` で軽量化しています
(各行の色を、許容誤差つきの折れ線で近似。`linear-gradient` が停止点の間を補間します)。

```sh
npm run optimize:art -- header.orig.svg src/image/header.svg  # 許容誤差 4(既定)。header.orig.svg は元データを header.svg と同じSVGで包んだもの
npm run optimize:art -- src/_pug/icon.pug --width=400      # style に width が無い場合は --width が必要
npm run optimize:art -- in.pug out.pug --tolerance=2       # 高精度寄り
```

最適化済みのファイルを再入力すると補間が失われて画質が落ちるため、スクリプトは止まります。
Git履歴にある元データ(高精度版)から作り直してください。

## Deploy files
`static/` の中身(`_headers`、`_routes.json`、`ogp.jpg`)は、ビルド時に `dist/` 直下へコピーされます。
ハッシュが付かないので、`_headers` の長期キャッシュ(`immutable`)の対象にしないでください。
