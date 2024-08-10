const tsConfigPaths = require("tsconfig-paths");
const tsConfig = require("./tsconfig.json");

tsConfigPaths.register({
    baseUrl: tsConfig.compilerOptions.outDir || "./dist",
    paths: tsConfig.compilerOptions.paths,
});
