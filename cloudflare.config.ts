import { bindings, defineConfig } from "cf/config";
import * as entrypoint from "./src/index.ts" with { type: "cf-worker" };

// The address Jotform loads the widget from is read from WIDGET_DOMAIN, so it
// isn't stored in the code: on your computer in a .env file next to this one
// (WIDGET_DOMAIN=age.example.com), in Cloudflare's automatic builds as a
// build variable. Use WIDGET_DOMAIN=workers.dev for a free workers.dev address.
const nodeProcess = (globalThis as any).process;
try {
	nodeProcess?.loadEnvFile?.(".env");
} catch {
	// no .env file: fine in automatic builds, which set the variable themselves
}
const widgetDomain = String(nodeProcess?.env?.WIDGET_DOMAIN ?? "").trim();
if (!widgetDomain) {
	throw new Error(
		"WIDGET_DOMAIN is not set. Add WIDGET_DOMAIN=age.example.com (your widget's address) " +
			"to a .env file in the project folder, or WIDGET_DOMAIN=workers.dev to use a free workers.dev address.",
	);
}
const useWorkersDev = widgetDomain === "workers.dev";

export default defineConfig({
	worker: {
		name: "jotform-age-check",
		compatibilityDate: "2026-09-30",
		entrypoint,
		// Every request goes through src/index.ts so it can block non-Jotform loads.
		assets: { runWorkerFirst: true },
		domains: useWorkersDev ? [] : [widgetDomain],
		workersDev: useWorkersDev,
		observability: { enabled: true, redactQueryString: true },
		env: {
			ASSETS: bindings.assets(),
		},
	},
});
