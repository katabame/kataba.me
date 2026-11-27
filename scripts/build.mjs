#!/usr/bin/env node
// 本番ビルド。出力先を空にしてから Parcel でビルドし、static/ の中身
// (_headers, _routes.json など、ビルド対象ではないが出力先の直下に必要なもの)をコピーする。
//
//   npm run build [-- <parcel build のオプション>]     例: npm run build -- --dist-dir /tmp/out
//
// 空にしないと、名前の変わった古いハッシュ付きファイルが出力先に残り続ける。
import { spawnSync } from "node:child_process";
import { cpSync, rmSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const args = process.argv.slice(2);

// --dist-dir <dir> / --dist-dir=<dir> を読み取る(Parcel にもそのまま渡す)
let distDir = "dist";
args.forEach((a, i) => {
	if (a === "--dist-dir") distDir = args[i + 1];
	else if (a.startsWith("--dist-dir=")) distDir = a.slice("--dist-dir=".length);
});
if (!distDir) {
	console.error("--dist-dir の値がありません");
	process.exit(1);
}
const out = resolve(root, distDir);

// 誤ってプロジェクトそのものや src/ などを消さないよう、
// プロジェクト内なら dist/ の中だけ、プロジェクト外ならプロジェクトを含まない場所だけ消す
const inside = (child, parent) => {
	const r = relative(parent, child);
	return r === "" || (!r.startsWith("..") && !isAbsolute(r));
};
const safe = inside(root, out) ? false : inside(out, root) ? inside(out, resolve(root, "dist")) : true;
if (!safe) {
	console.error(`出力先 ${out} は消去できない場所なので中止します(プロジェクト内では dist/ のみ使えます)`);
	process.exit(1);
}
rmSync(out, { recursive: true, force: true });

// npm 経由でなくても(PATH に node_modules/.bin が無くても)動くよう、Parcel の本体を直接実行する
const parcelBin = resolve(root, "node_modules/parcel/lib/bin.js");
const parcel = spawnSync(process.execPath, [parcelBin, "build", "./src/index.pug", "--no-cache", "--no-source-maps", ...args], {
	cwd: root,
	stdio: "inherit",
});
if (parcel.status !== 0) process.exit(parcel.status ?? 1);

cpSync(resolve(root, "static"), out, { recursive: true });
