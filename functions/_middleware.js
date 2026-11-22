const E = "\x1b[";
const paint = (code, text) => `${E}${code}m${text}${E}0m`;

// カタバミ(ハート形の3枚葉)のロゴ。「\」は JS 文字列用に「\\」と書いています
const LOGO = [
	"         .-.   .-.",
	"        (   '-'   )",
	"         \\       /",
	"   .--.   \\     /   .--.",
	"  (    `-. \\   / ,-'    )",
	"   >      > \\ / <      <",
	"  (    ,-'   V   `-.    )",
	"   `--'      |      `--'",
	"             |",
];
const LOGO_WIDTH = Math.max(...LOGO.map((line) => line.length)) + 2;

const LINKS = [
	["X", "https://x.com/katabame"],
	["Steam", "https://steamcommunity.com/id/katabame"],
	["GitHub", "https://github.com/katabame"],
];

function render(plain) {
	const labelWidth = Math.max(...LINKS.map(([k]) => k.length));
	const colorBar =
		[40, 41, 42, 43, 44, 45, 46, 47].map((n) => `${E}${n}m  `).join("") + `${E}0m`;

	const info = [
		paint("1;32", "kataba.me"),
		"-".repeat("kataba.me".length),
		...LINKS.map(([k, v]) => `${paint("1;32", k.padEnd(labelWidth))} ${v}`),
		"",
		colorBar,
	];

	const rows = Math.max(LOGO.length, info.length);
	const lines = [];
	for (let i = 0; i < rows; i++) {
		const logo = (LOGO[i] ?? "").padEnd(LOGO_WIDTH);
		lines.push(`${paint("1;32", logo)}   ${info[i] ?? ""}`);
	}

	const text = "\n" + lines.join("\n") + "\n\n";
	// ?plain のときはANSIエスケープを除去
	return plain ? text.replace(/\x1b\[[0-9;]*m/g, "") : text;
}

export async function onRequest(context) {
	const { request } = context;
	const url = new URL(request.url);
	const ua = request.headers.get("User-Agent") || "";
	const isCli = /^(curl|Wget|HTTPie|xh)\b/i.test(ua);

	if (isCli && url.pathname === "/") {
		return new Response(render(url.searchParams.has("plain")), {
			headers: {
				"Content-Type": "text/plain; charset=utf-8",
				"Vary": "User-Agent",
				// Functionsが生成したレスポンスには _headers が適用されないので、ここで付ける
				"Cache-Control": "public, max-age=0, must-revalidate",
				"X-Content-Type-Options": "nosniff",
				"Referrer-Policy": "strict-origin-when-cross-origin",
			},
		});
	}

	// 同じURLでもUAによって中身が変わる(curl向け/ブラウザ向け)ので、キャッシュを分ける
	const res = await context.next();
	const out = new Response(res.body, res);
	out.headers.append("Vary", "User-Agent");
	return out;
}
