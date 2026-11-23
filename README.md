![eyecatch image](https://user-images.githubusercontent.com/9818101/79817116-a943b380-83bf-11ea-9e7a-6d59ba75f5a6.png "Art by kuropapu")

## Used Technologies
* [Parcel](https://parceljs.org) for build / optimize asset
* [Stylus](https://stylus-lang.com) for CSS preprocessor
* [Pug](https://pugjs.org) for HTML preprocessor
* [Cloudflare Pages](https://www.cloudflare.com/products/pages) for hosting / edge CDN / Functions (terminal view for `curl kataba.me`)
* [ImageMagick](https://imagemagick.org) for optimize / convert image
* `scripts/optimize-css-art.mjs` for optimize CSS art
* [Smooth shadow generator](https://smoothshadows.com) for calculate layered shadow
* [Mulish](https://github.com/googlefonts/mulish) for font (SIL Open Font License 1.1, see `src/font/Mulish/OFL.txt`)
* [Font Awesome Free](https://fontawesome.com) for social icons (CC BY 4.0)
* [Can I use...](https://caniuse.com) for browser support check
* [Zed](https://zed.dev) for code editor
* [PageSpeed Insights](https://pagespeed.web.dev) for measure performance
* Claude / Muse for manage project
* Me for code
* You for visit

## CSS art
`src/image/avatar-art.svg`(アバター)と `src/image/header.svg`(拡大表示)は、1px高の `linear-gradient` を縦に並べたCSSアートです。
どちらもSVGの `foreignObject` に入れて背景画像として読み込んでいます(ハッシュ付きのファイル名で長期キャッシュされる)。
拡大表示のほう(約3MB)はモーダルの背景なので、モーダルを開くまで取得されません。
元データは写真由来のノイズで巨大になりがちなので、`scripts/optimize-css-art.mjs` で軽量化しています
(各行の色を、許容誤差つきの折れ線で近似。`linear-gradient` が停止点の間を補間します)。

```sh
npm run optimize:art -- header.orig.svg src/image/header.svg --tolerance=6
npm run optimize:art -- avatar.orig.svg src/image/avatar-art.svg --tolerance=6
```

`*.orig.svg` は、Git履歴にある元データ(高精度版)の div を、現在のファイルと同じSVGで包んだものです。
現在の許容誤差はどちらも 6 です(既定は 4)。8 以上にすると肌に横すじが出始めます。

最適化済みのファイルを再入力すると補間が失われて画質が落ちるため、スクリプトは止まります。
Git履歴にある元データ(高精度版)から作り直してください。

## Deploy files
`static/` の中身(`_headers`、`_routes.json`、`404.html`、`robots.txt`、`favicon.ico`、`ogp.jpg`)は、ビルド時に `dist/` 直下へコピーされます。
`404.html` が無いと、Cloudflare Pages は存在しないURLにもトップページを 200 で返す(SPA扱い)ので、消さないでください。
ハッシュが付かないので、`_headers` の長期キャッシュ(`immutable`)の対象にしないでください。

## License
- Code: [MIT License](LICENCE)
- Illustration (art by kuropapu) and every file derived from it are **not** covered by the MIT License.
  All rights belong to the artist. Do not reuse, modify or redistribute them without permission.
  - `src/image/avatar-art.svg`, `src/image/header.svg`(CSS art)
  - `src/image/avatar.png`, `src/image/avatar.webp`, `src/image/apple-touch-icon.png`, `static/favicon.ico`, `static/ogp.jpg`
- Font: Mulish — SIL Open Font License 1.1 (`src/font/Mulish/OFL.txt`)
- Icons: Font Awesome Free — CC BY 4.0

コードは MIT ライセンスです。イラスト(kuropapu さん作)と、それをもとに作った画像・CSSアートは MIT の対象外で、権利は作者に帰属します。
