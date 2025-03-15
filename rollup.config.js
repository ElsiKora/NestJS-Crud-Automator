import typescript from "@rollup/plugin-typescript";

const external = ["@nestjs/common", "@nestjs/swagger", "@nestjs/throttler", "node:crypto", "rxjs/operators", "rxjs", "class-transformer", "typeorm", "class-validator", "reflect-metadata", "lodash/random", "@nestjs/common/constants", "@nestjs/common/enums/route-paramtypes.enum", "@nestjs/swagger/dist/constants", "typeorm/index"];

export default [
	{
		external,
		input: "src/index.ts",
		output: {
			dir: "dist/",
			exports: "named",
			format: "cjs",
			preserveModules: true,
			preserveModulesRoot: "src",
			sourcemap: true,
		},
		plugins: [
			typescript({
				declaration: true,
				declarationDir: "dist/",
				noForceEmit: false,
				outDir: "dist/",
				sourceMap: true,
				tsconfig: "./tsconfig.build.json",
			}),
		],
	},
];
