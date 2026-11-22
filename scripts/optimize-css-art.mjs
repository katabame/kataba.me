#!/usr/bin/env node
// CSSアート(1px高の linear-gradient を縦に並べたもの)を軽量化する。
//
//   node scripts/optimize-css-art.mjs <入力.pug> [出力.pug] [--tolerance=N] [--width=PX]
//
//   --width      style に width が無いときの描画幅(px)
//   --tolerance  行内の色を折れ線近似するときの許容誤差(RGB各チャンネルの最大差、既定 4)
//
// 入力は「<div class="..." style="width:..;height:..;background-image:linear-gradient(90deg,...),...;
// background-size:100% 1px;background-position:0 0,0 1px,...">」形式の1行HTML。
// 元データ(高精度版)はGit履歴に残るので、不満があれば許容誤差を下げて履歴の版から作り直せる。
import { readFileSync, writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const opt = { tolerance: 4, width: 0 };
const files = [];
for (const a of args) {
	const m = a.match(/^--(\w+)(?:=(.*))?$/);
	if (!m) files.push(a);
	else opt[m[1]] = Number(m[2]);
}
const [inFile, outFile = inFile] = files;
if (!inFile) {
	console.error("usage: optimize-css-art.mjs <in.pug> [out.pug] [--tolerance=N]");
	process.exit(1);
}

const src = readFileSync(inFile, "utf8");
const wrap = src.match(/^(<div[^>]*?) style="([^"]*)"(><\/div>\s*)$/s);
if (!wrap) throw new Error("想定外の形式です(<div ... style=\"...\"></div> の1行)");
const [, open, style, close] = wrap;

const decls = style.split(";");
const get = (name) => decls.find((d) => d.startsWith(name + ":"))?.slice(name.length + 1);
const width = parseInt(get("width") ?? "", 10) || opt.width;
if (!width) throw new Error("幅が分かりません。style に width が無い場合は --width=<px> を指定してください");
const bg = get("background-image");
if (!bg) throw new Error("background-image が見つかりません");

// ---- パース --------------------------------------------------------------
const parseHex = (h) => {
	h = h.slice(1);
	if (h.length === 3) h = [...h].map((c) => c + c).join("");
	return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};
const rows = [];
let rowW = 0;
for (const m of bg.matchAll(/linear-gradient\(90deg,([^)]*)\)/g)) {
	// 1画素ごとの色に展開する(幅が不明なら最後の停止位置から推定)
	const stops = m[1].split(",").map((s) => s.trim().split(/\s+/));
	let pos = 0;
	const runs = [];
	for (const [color, a, b] of stops) {
		const end = b !== undefined ? parseFloat(b) : a !== undefined && a !== "0" ? parseFloat(a) : null;
		runs.push({ rgb: parseHex(color), end });
	}
	rows.push(runs);
	rowW = Math.max(rowW, ...runs.map((r) => r.end ?? 0));
}
const W = width;
const H = rows.length;

const expandRow = (runs) => {
	const px = new Array(W);
	let x = 0;
	for (let i = 0; i < runs.length; i++) {
		const end = runs[i].end === null ? W : Math.min(W, Math.round(runs[i].end));
		for (; x < end; x++) px[x] = runs[i].rgb;
	}
	for (; x < W; x++) px[x] = runs[runs.length - 1].rgb;
	return px;
};

// ---- 折れ線近似(Ramer–Douglas–Peucker、色空間は各チャンネル最大差) -----------
const maxDiff = (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));
function simplify(px, tol) {
	const keep = new Uint8Array(px.length);
	keep[0] = keep[px.length - 1] = 1;
	const stack = [[0, px.length - 1]];
	while (stack.length) {
		const [i, j] = stack.pop();
		let worst = -1, at = -1;
		for (let k = i + 1; k < j; k++) {
			const t = (k - i) / (j - i);
			const e = Math.max(
				Math.abs(px[i][0] + (px[j][0] - px[i][0]) * t - px[k][0]),
				Math.abs(px[i][1] + (px[j][1] - px[i][1]) * t - px[k][1]),
				Math.abs(px[i][2] + (px[j][2] - px[i][2]) * t - px[k][2]),
			);
			if (e > worst) (worst = e), (at = k);
		}
		if (worst > tol) {
			keep[at] = 1;
			stack.push([i, at], [at, j]);
		}
	}
	const pts = [];
	for (let k = 0; k < px.length; k++) if (keep[k]) pts.push({ x: k, rgb: px[k] });
	return pts;
}

// ---- 出力 ---------------------------------------------------------------
const hex = (rgb) => {
	const h = rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0"));
	return h[0][0] === h[0][1] && h[1][0] === h[1][1] && h[2][0] === h[2][1] ? `#${h[0][0]}${h[1][0]}${h[2][0]}` : `#${h.join("")}`;
};
const num = (v) => String(Math.round(v * 10) / 10);

function toStops(pts) {
	// 画素 x の色は位置 x+0.5(画素中心)のものなので、停止位置は x+0.5 で出力する。
	// (整数位置のままだと半画素ずれて、境界がにじむ)
	return pts.map((p) => `${hex(p.rgb)} ${num(p.x + 0.5)}px`);
}

const simplified = rows.map((r) => simplify(expandRow(r), opt.tolerance));

const blocks = simplified.map((pts) => ({ pts, h: 1 }));

const gradients = blocks.map((b) => `linear-gradient(90deg,${toStops(b.pts).join(",")})`);
let y = 0;
const positions = blocks.map((b) => {
	const p = `0 ${y}px`;
	y += b.h;
	return p;
});

const keep = decls.filter((d) => !/^(background-image|background-size|background-position)\b/.test(d));
const rebuilt = [
	...keep.filter((d) => d !== "background-repeat:no-repeat" && d !== ""),
	`background-image:${gradients.join(",")}`,
	"background-size:100% 1px",
	`background-position:${positions.join(",")}`,
	"background-repeat:no-repeat",
].join(";");

writeFileSync(outFile, `${open} style="${rebuilt}"${close}`);
const before = src.length, after = rebuilt.length;
console.error(
	`${inFile}: ${W}x${H}px, ${(before / 1e6).toFixed(2)}MB -> ${(after / 1e6).toFixed(2)}MB (${((after / before) * 100).toFixed(1)}%), ` +
		`停止点 ${rows.reduce((n, r) => n + r.length, 0)} -> ${blocks.reduce((n, b) => n + b.pts.length, 0)}`,
);
