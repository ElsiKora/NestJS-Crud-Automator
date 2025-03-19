import typescript from "@rollup/plugin-typescript";

const external = ["@elsikora/pluralizer", "@nestjs/common", "@nestjs/swagger", "@nestjs/throttler", "node:crypto", "rxjs/operators", "typeorm", "class-transformer", "reflect-metadata", "class-validator", "lodash/random", "@nestjs/common/constants", "@nestjs/common/enums/route-paramtypes.enum", "@nestjs/swagger/dist/constants", "typeorm/index"];
import resolve from "@rollup/plugin-node-resolve";

export default [
	{
		external,
		input: "src/index.ts",
		output: {
			dir: "dist/cjs",
			entryFileNames: (chunkInfo) => {
				if (chunkInfo.name.includes("node_modules")) {
					return chunkInfo.name.replace("node_modules", "external") + ".js";
				}

				return "[name].js";
			},
			exports: "named",
			format: "cjs",
			preserveModules: true,
			preserveModulesRoot: "src",
			sourcemap: true,
		},
		plugins: [
			resolve({
				include: ["node_modules/tslib/**"],
			}),
			typescript({
				declaration: true,
				declarationDir: "dist/cjs",
				outDir: "dist/cjs",
				sourceMap: true,
				tsconfig: "./tsconfig.build.json",
			}),
		],
	},
];
