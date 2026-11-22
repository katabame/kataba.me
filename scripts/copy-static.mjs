#!/usr/bin/env node
// static/ の中身(_headers, _routes.json など、ビルド対象ではないがdist直下に必要なもの)を出力先へコピーする。
//   node scripts/copy-static.mjs [出力先(既定: dist)]
import { cpSync } from "node:fs";
cpSync(new URL("../static", import.meta.url), process.argv[2] ?? new URL("../dist", import.meta.url), { recursive: true });
