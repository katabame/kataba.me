#!/usr/bin/env node
// CSSアート(1px高の linear-gradient を縦に並べたもの)を軽量化する。
//
//   node scripts/optimize-css-art.mjs <入力> [出力] [--tolerance=N] [--width=PX] [--force]
//
//   --width      style に width が無いときの描画幅(px)
//   --tolerance  行内の色を折れ線近似するときの許容誤差(RGB各チャンネルの最大差、既定 4)
//   --force      最適化済みに見える入力でも処理する(画質が落ちる)
//
// 入力は「<div class="..." style="width:..;height:..;background-image:linear-gradient(90deg,...),...;
// background-size:100% 1px;background-position:0 0,0 1px,..."></div>」を1つ含むファイル(.pug / .svg など)。
// div の前後(SVGの外枠など)はそのまま残す。
// 元データ(高精度版)はGit履歴に残るので、不満があれば許容誤差を下げて履歴の版から作り直せる。
import { readFileSync, writeFileSync } from "node:fs";

const USAGE = "usage: optimize-css-art.mjs <in> [out] [--tolerance=N] [--width=PX] [--force]";
const fail = (msg) => {
	console.error(msg);
	process.exit(1);
};

const opt = { tolerance: 4, width: 0, force: false };
const files = [];
for (const a of process.argv.slice(2)) {
	const m = a.match(/^--(\w+)(?:=(.*))?$/);
	if (!m) {
		files.push(a);
		continue;
	}
	const [, key, value] = m;
	if (key === "force") {
		opt.force = true;
	} else if (key === "tolerance" || key === "width") {
		const n = Number(value);
		if (value === undefined || value === "" || !Number.isFinite(n) || n < 0) fail(`--${key} には0以上の数値を指定してください(例: --${key}=4)`);
		opt[key] = n;
	} else {
		fail(`不明なオプション: ${a}\n${USAGE}`);
	}
}
const [inFile, outFile = inFile] = files;
if (!inFile || files.length > 2) fail(USAGE);

const src = readFileSync(inFile, "utf8");
const wrap = src.match(/^([\s\S]*?<div[^>]*?) style="([^"]*)"(><\/div>[\s\S]*)$/);
if (!wrap) fail('想定外の形式です(<div ... style="..."></div> が見つかりません)');
const [, open, style, close] = wrap;

const decls = style.split(";");
const get = (name) => decls.find((d) => d.startsWith(name + ":"))?.slice(name.length + 1);
const W = parseInt(get("width") ?? "", 10) || opt.width;
if (!W) fail("幅が分かりません。style に width が無い場合は --width=<px> を指定してください");
const bg = get("background-image");
if (!bg) fail("background-image が見つかりません");

// 最適化済みの出力は停止位置が画素中心(x.5px)で、停止点の間を補間している。
// これを単色の区間として読み直すと補間が失われ、画質が落ちるので既定では止める。
if (/\d\.5px/.test(bg) && !opt.force) {
	fail("最適化済みのファイルのようです。Git履歴の元データから作り直してください(承知の上なら --force)");
}

// ---- パース --------------------------------------------------------------
const parseHex = (h) => {
	h = h.slice(1);
	if (h.length === 3) h = [...h].map((c) => c + c).join("");
	return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};
const rows = [];
for (const m of bg.matchAll(/linear-gradient\(90deg,([^)]*)\)/g)) {
	const runs = m[1].split(",").map((s) => {
		const [color, a, b] = s.trim().split(/\s+/);
		const end = b !== undefined ? parseFloat(b) : a !== undefined && a !== "0" ? parseFloat(a) : null;
		return { rgb: parseHex(color), end };
	});
	rows.push(runs);
}
const H = rows.length;

// 1画素ごとの色に展開する
const expandRow = (runs) => {
	const px = new Array(W);
	let x = 0;
	for (const run of runs) {
		const end = run.end === null ? W : Math.min(W, Math.round(run.end));
		for (; x < end; x++) px[x] = run.rgb;
	}
	for (; x < W; x++) px[x] = runs[runs.length - 1].rgb;
	return px;
};

// ---- 折れ線近似(Ramer–Douglas–Peucker、色空間は各チャンネル最大差) -----------
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
	return h.every((c) => c[0] === c[1]) ? `#${h[0][0]}${h[1][0]}${h[2][0]}` : `#${h.join("")}`;
};
const num = (v) => String(Math.round(v * 10) / 10);

// 画素 x の色は位置 x+0.5(画素中心)のものなので、停止位置は x+0.5 で出力する。
// (整数位置のままだと半画素ずれて、境界がにじむ)
const toStops = (pts) => pts.map((p) => `${hex(p.rgb)} ${num(p.x + 0.5)}px`);

const simplified = rows.map((r) => simplify(expandRow(r), opt.tolerance));
const gradients = simplified.map((pts) => `linear-gradient(90deg,${toStops(pts).join(",")})`);
const positions = simplified.map((_, y) => `0 ${y}px`);

const keep = decls.filter((d) => d !== "" && !/^(background-image|background-size|background-position|background-repeat)\b/.test(d));
const rebuilt = [
	...keep,
	`background-image:${gradients.join(",")}`,
	"background-size:100% 1px",
	`background-position:${positions.join(",")}`,
	"background-repeat:no-repeat",
].join(";");

const out = `${open} style="${rebuilt}"${close}`;
writeFileSync(outFile, out);
const mb = (n) => (n / 1e6).toFixed(2) + "MB";
console.error(
	`${inFile}: ${W}x${H}px, ${mb(src.length)} -> ${mb(out.length)} (${((out.length / src.length) * 100).toFixed(1)}%), ` +
		`停止点 ${rows.reduce((n, r) => n + r.length, 0)} -> ${simplified.reduce((n, p) => n + p.length, 0)}`,
);
