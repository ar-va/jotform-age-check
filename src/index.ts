// Serves the Jotform age-check widget. Everything runs in the visitor's
// browser; this Worker only decides who gets the files.
//
//   GET /         the widget page (public/index.html), only inside a Jotform iframe
//   GET /age.js   the age calculation the page loads (public/age.js)
import { env } from "cloudflare:workers";

// Sites allowed to embed the widget. Add a Jotform custom form domain here if you use one.
const ALLOWED_HOSTS = ["jotform.com"];
const FRAME_ANCESTORS = ALLOWED_HOSTS.flatMap((h) => [`https://${h}`, `https://*.${h}`]).join(" ");

// Sent with every response. The page allows scripts from Jotform's widget
// library (which loads theme files and fonts itself), so script sources are
// not restricted; everything else that isn't needed is switched off.
const COMMON_HEADERS = {
	"X-Content-Type-Options": "nosniff",
	"Referrer-Policy": "same-origin",
	"X-Robots-Tag": "noindex, nofollow",
	"Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
	"Strict-Transport-Security": "max-age=31536000",
};
const PAGE_CSP = `frame-ancestors ${FRAME_ANCESTORS}; object-src 'none'; base-uri 'none'; form-action 'none'`;
const OTHER_CSP = "default-src 'none'; frame-ancestors 'none'";

function hostMatches(url: string, hosts: string[]): boolean {
	try {
		const host = new URL(url).hostname;
		return hosts.some((h) => host === h || host.endsWith("." + h));
	} catch {
		return false;
	}
}

function withHeaders(res: Response, headers: Record<string, string>): Response {
	const out = new Response(res.body, res);
	for (const [k, v] of Object.entries({ ...COMMON_HEADERS, ...headers })) out.headers.set(k, v);
	return out;
}

function text(body: string, status: number): Response {
	return withHeaders(new Response(body, { status }), {
		"Content-Type": "text/plain",
		"Content-Security-Policy": OTHER_CSP,
	});
}

// Modern browsers send Sec-Fetch-Dest: iframe for framed loads, and the
// frame-ancestors policy stops non-Jotform pages from framing it. Older
// browsers without Sec-Fetch-* fall back to a Referer check.
async function servePage(request: Request, url: URL): Promise<Response> {
	const dest = request.headers.get("Sec-Fetch-Dest");
	const allowed = dest === "iframe" || (!dest && hostMatches(request.headers.get("Referer") ?? "", ALLOWED_HOSTS));
	if (!allowed) return text("Forbidden", 403);

	const res = await env.ASSETS.fetch(new Request(new URL("/", url), request));
	return withHeaders(res, {
		"Content-Security-Policy": PAGE_CSP,
		"Cache-Control": "no-cache",
		Vary: "Sec-Fetch-Dest, Referer",
	});
}

// The script holds no secrets, so it isn't gated; no-cache makes updates show up straight away.
// Cross-Origin-Resource-Policy stops other sites from loading it as a script.
async function serveScript(request: Request): Promise<Response> {
	const res = await env.ASSETS.fetch(request);
	return withHeaders(res, {
		"Content-Security-Policy": OTHER_CSP,
		"Cache-Control": "no-cache",
		"Cross-Origin-Resource-Policy": "same-origin",
	});
}

export default {
	async fetch(request) {
		const url = new URL(request.url);
		if (request.method !== "GET" && request.method !== "HEAD") return text("Method not allowed", 405);
		if (url.pathname === "/" || url.pathname === "/index.html") return servePage(request, url);
		if (url.pathname === "/age.js") return serveScript(request);
		return text("Not found", 404);
	},
} satisfies ExportedHandler;
