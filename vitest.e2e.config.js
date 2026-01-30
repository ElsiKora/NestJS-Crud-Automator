// eslint-disable-next-line @elsikora/unicorn/prevent-abbreviations
import typescript from "@rollup/plugin-typescript";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
	esbuild: false,
	plugins: [
		tsconfigPaths(),
		typescript({
			compilerOptions: {
				declaration: false,
				declarationMap: false,
				emitDecoratorMetadata: true,
				experimentalDecorators: true,
			},
			tsconfig: "./tsconfig.json",
		}),
	],
	publicDir: false,
	resolve: {
		alias: {
			lodash: "lodash",
			"lodash/random": "lodash/random.js",
		},
	},
	ssr: {
		noExternal: ["@elsikora/nestjs-crud-automator"],
	},
	test: {
		coverage: {
			exclude: ["**/interface/**", "**/type/**", "**/index.ts"],
			include: ["src/**/*"],
			provider: "v8",
			reporter: ["text", "json", "html"],
		},
		deps: {
			inline: ["@elsikora/nestjs-crud-automator"],
		},
		environment: "node",
		exclude: ["node_modules/**/*"],
		globals: true,
		include: ["test/e2e/**/*.test.ts"],
		root: ".",
		testTimeout: 10_000,
		watch: false,
	},
});
