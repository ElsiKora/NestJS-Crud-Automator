/* eslint-disable @elsikora/unicorn/prevent-abbreviations */

import typescript from "@rollup/plugin-typescript";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
	esbuild: false,
	logLevel: "error",
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
		fileParallelism: false,
		globals: true,
		// Longer than testTimeout: hooks seed rows and stop containers. The explicit container hooks use this value too.
		hookTimeout: 120_000,
		include: ["test/e2e/**/*.test.ts"],
		maxWorkers: 1,
		root: ".",
		testTimeout: 10_000,
		watch: false,
	},
});
