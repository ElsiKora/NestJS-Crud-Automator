#!/usr/bin/env node
/**
 * Consumer smoke test for the packed package.
 *
 * Packs the built package, installs the tarball with the peer stack into a temporary
 * project and, for every consumer in test/consumer (ESM bundler, ESM nodenext, CommonJS
 * node10 and CommonJS with the default resolution, both through require(esm)), typechecks every app (test/consumer/app with the CRUD,
 * authorization, pagination and Swagger scenarios, test/consumer/cyclic with entities that
 * import each other through Relation<T>) and runs it against Postgres. The swc consumer has its own app with extensionless
 * alias imports: SWC builds it to ES modules as the Nest CLI SWC builder does, and tsc only typechecks it with bundler resolution.
 * test/consumer/bundle goes through esbuild with class-transformer inside the bundle and needs no database.
 * DATABASE_URL selects an existing database; otherwise a testcontainers Postgres is started and removed afterwards.
 *
 * Flags: --skip-build reuses the current dist, --keep leaves the temporary project in place, --peer-floors installs
 * every peerDependency at the lower bound of its range (and @nestjs/platform-fastify at the @nestjs/core floor) instead of
 * the repository devDependency versions, and fails unless exactly those versions were installed.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CONSUMER_ROOT = path.join(ROOT, "test/consumer");

const APPS = ["app", "cyclic"];

const CONSUMERS = [
	{ name: "bundler", type: "module" },
	{ name: "nodenext", type: "module" },
	{ name: "commonjs", type: "commonjs" },
	// module: commonjs without moduleResolution, as in Core and Gameport: TypeScript 6 resolves it as bundler and reads exports
	{ name: "commonjs-default", type: "commonjs" },
	// Native ES modules built by SWC from extensionless @-alias imports, as in Core and Gameport; typechecked by tsc --noEmit
	{ apps: ["swc"], compiler: "swc", name: "swc", type: "module" },
];
const STACK = ["@fastify/static", "@nestjs/common", "@nestjs/core", "@nestjs/platform-fastify", "@nestjs/swagger", "@nestjs/throttler", "@nestjs/typeorm", "class-transformer", "class-validator", "fastify", "lodash", "pg", "typeorm", "typescript"];
// @types/node follows the oldest supported Node major: newer majors drop worker_threads types that pino's thread-stream still declares
const TYPES_NODE_RANGE = "^22.13.0";
// The exception filter must load without these optional NestJS transports
const ABSENT_PACKAGES = ["@nestjs/microservices", "@nestjs/platform-socket.io", "@nestjs/websockets", "socket.io-client"];
// The SWC toolchain is not a repository devDependency, so the smoke pins it exactly
const SWC_TOOLCHAIN = { "@swc/cli": "0.8.1", "@swc/core": "1.16.18" };
// esbuild is not a repository devDependency either, so the smoke pins it exactly
const ESBUILD_VERSION = "0.28.2";
// The bundling that picks the ES entry of class-transformer next to the deep import of its CommonJS storage, and the ways out the refusal names
const STORAGE_REFUSAL = "Cannot read class-transformer metadata";
const BUNDLE_TWO_COPIES = ["--main-fields=module,main"];

const BUNDLES_ONE_COPY = [
	{ flags: ["--main-fields=main,module"], name: "main before module" },
	// An esbuild alias also rewrites subpaths, so the storage needs its own, longer alias to keep its path
	{ flags: ["--main-fields=module,main", "--alias:class-transformer=class-transformer/cjs/index.js", "--alias:class-transformer/cjs/storage.js=class-transformer/cjs/storage.js"], name: "alias" },
];
const ARGS = new Set(process.argv.slice(2));
// Nest packages that must stay on the @nestjs/core release when the peers are pinned to their floors
const NEST_FLOOR_FOLLOWERS = ["@nestjs/platform-fastify"];

/**
 * Returns the lower bound of every peerDependency range, such as 12.3.2 for ">=12.3.2 <13".
 * @param {Record<string, string>} peerDependencies - The repository peerDependencies.
 * @returns {Record<string, string>} Exact versions by package name.
 */
function getPeerFloors(peerDependencies) {
	const floors = {};

	for (const [name, range] of Object.entries(peerDependencies)) {
		const floor = /^>=(\d+\.\d+\.\d+)\s/.exec(range)?.[1];

		if (!floor) {
			throw new Error(`The peer range of ${name} has no >= lower bound: ${range}`);
		}

		floors[name] = floor;
	}

	for (const name of NEST_FLOOR_FOLLOWERS) {
		floors[name] = floors["@nestjs/core"];
	}

	return floors;
}

/**
 * Runs a command with inherited output and fails the smoke when it exits non-zero.
 * @param {string} command - Executable.
 * @param {Array<string>} commandArguments - Arguments.
 * @param {{ cwd: string, env?: NodeJS.ProcessEnv }} options - Working directory and environment.
 * @returns {void}
 */
function run(command, commandArguments, options) {
	process.stdout.write(`$ ${command} ${commandArguments.join(" ")}\n`);
	execFileSync(command, commandArguments, { cwd: options.cwd, env: options.env ?? process.env, stdio: "inherit" });
}

/**
 * Builds the temporary project manifest: the tarball plus the stack versions the repository tests with.
 * @param {string} tarball - Absolute tarball path.
 * @returns {string} The manifest JSON.
 */
function createManifest(tarball) {
	const repositoryManifest = JSON.parse(readFileSync(path.join(ROOT, "package.json"), "utf8"));
	const dependencies = { "@elsikora/nestjs-crud-automator": `file:${tarball}`, "@types/node": TYPES_NODE_RANGE, "reflect-metadata": repositoryManifest.dependencies["reflect-metadata"], rxjs: repositoryManifest.dependencies.rxjs, ...SWC_TOOLCHAIN, esbuild: ESBUILD_VERSION };

	for (const name of STACK) {
		const version = repositoryManifest.devDependencies[name];

		if (!version) {
			throw new Error(`The repository has no devDependency ${name} to pin the consumer stack to`);
		}

		dependencies[name] = version;
	}

	if (ARGS.has("--peer-floors")) {
		Object.assign(dependencies, getPeerFloors(repositoryManifest.peerDependencies));
	}

	return JSON.stringify({ dependencies, name: "crud-automator-consumer-smoke", private: true }, undefined, "\t");
}

/**
 * Returns a database URL: DATABASE_URL when set, otherwise a fresh testcontainers Postgres.
 * @returns {Promise<{ stop: () => Promise<void>, url: string }>} The URL and a stop callback.
 */
async function startDatabase() {
	if (process.env.DATABASE_URL) {
		return { stop: async () => {}, url: process.env.DATABASE_URL };
	}

	const { PostgreSqlContainer } = await import("@testcontainers/postgresql");
	const container = await new PostgreSqlContainer("postgres:17-alpine").start();

	return { stop: async () => void (await container.stop()), url: container.getConnectionUri() };
}

/**
 * Bundles test/consumer/bundle with the package and class-transformer inside, then runs it: two copies of class-transformer must fail at decoration, one must pass.
 * @param {string} workDirectory - The temporary project.
 * @returns {void}
 */
function testBundledConsumer(workDirectory) {
	const bundleDirectory = path.join(workDirectory, "bundle");
	const packageManifest = JSON.parse(readFileSync(path.join(ROOT, "package.json"), "utf8"));
	const bundled = new Set(["class-transformer"]);
	const externals = [...Object.keys(packageManifest.dependencies ?? {}), ...Object.keys(packageManifest.peerDependencies ?? {}), "@nestjs/*", "lodash/*"].filter((name) => !bundled.has(name)).map((name) => `--external:${name}`);

	cpSync(path.join(CONSUMER_ROOT, "bundle"), bundleDirectory, { recursive: true });

	const bundle = (flags) => {
		run(path.join(workDirectory, "node_modules/.bin/esbuild"), ["main.mjs", "--bundle", "--platform=node", "--format=cjs", "--outfile=dist/main.cjs", "--log-level=warning", ...externals, ...flags], { cwd: bundleDirectory });
	};

	process.stdout.write("\n=== consumer bundle, two copies of class-transformer ===\n");
	bundle(BUNDLE_TWO_COPIES);

	const refused = spawnSync("node", ["dist/main.cjs"], { cwd: bundleDirectory, encoding: "utf8" });

	if (refused.status === 0 || !refused.stderr.includes(STORAGE_REFUSAL)) {
		throw new Error(`A bundle with two copies of class-transformer must fail with "${STORAGE_REFUSAL}": exit ${refused.status}\n${refused.stderr}`);
	}

	process.stdout.write(`PASS bundled: two copies fail with "${STORAGE_REFUSAL}"\n`);

	for (const { flags, name } of BUNDLES_ONE_COPY) {
		process.stdout.write(`\n=== consumer bundle, ${name} ===\n`);
		bundle(flags);
		run("node", ["dist/main.cjs"], { cwd: bundleDirectory });
	}
}

const workDirectory = mkdtempSync(path.join(tmpdir(), "crud-automator-consumer-"));
let database;
let failed = false;

try {
	if (!ARGS.has("--skip-build")) {
		run("npm", ["run", "build"], { cwd: ROOT });
	}

	run("npm", ["pack", "--pack-destination", workDirectory], { cwd: ROOT });

	const tarball = path.join(
		workDirectory,
		readdirSync(workDirectory).find((file) => file.endsWith(".tgz")),
	);

	writeFileSync(path.join(workDirectory, "package.json"), createManifest(tarball));
	run("npm", ["install", "--no-audit", "--no-fund", "--loglevel=error"], { cwd: workDirectory });

	if (ARGS.has("--peer-floors")) {
		const repositoryManifest = JSON.parse(readFileSync(path.join(ROOT, "package.json"), "utf8"));

		for (const [name, floor] of Object.entries(getPeerFloors(repositoryManifest.peerDependencies))) {
			const installed = JSON.parse(readFileSync(path.join(workDirectory, "node_modules", name, "package.json"), "utf8")).version;

			if (installed !== floor) {
				throw new Error(`${name} is ${installed}, not its floor ${floor}`);
			}

			process.stdout.write(`peer floor ${name}@${installed}\n`);
		}
	}

	for (const name of ABSENT_PACKAGES) {
		if (existsSync(path.join(workDirectory, "node_modules", name))) {
			throw new Error(`The consumer project must not have ${name}`);
		}
	}

	try {
		testBundledConsumer(workDirectory);
	} catch (error) {
		failed = true;
		process.stdout.write(`consumer bundle FAILED: ${error instanceof Error ? error.message : String(error)}\n`);
	}

	database = await startDatabase();

	for (const consumer of CONSUMERS) {
		for (const app of consumer.apps ?? APPS) {
			const consumerDirectory = path.join(workDirectory, `${consumer.name}-${app}`);

			cpSync(path.join(CONSUMER_ROOT, app, "src"), path.join(consumerDirectory, "src"), { recursive: true });
			cpSync(path.join(CONSUMER_ROOT, consumer.name, "tsconfig.json"), path.join(consumerDirectory, "tsconfig.json"));
			writeFileSync(path.join(consumerDirectory, "package.json"), JSON.stringify({ name: `consumer-${consumer.name}-${app}`, private: true, type: consumer.type }));

			try {
				process.stdout.write(`\n=== consumer ${consumer.name} (${consumer.type}), app ${app} ===\n`);
				run("node", [path.join(workDirectory, "node_modules/typescript/bin/tsc"), "-p", "tsconfig.json"], { cwd: consumerDirectory });

				if (consumer.compiler === "swc") {
					cpSync(path.join(CONSUMER_ROOT, consumer.name, ".swcrc"), path.join(consumerDirectory, ".swcrc"));
					run("node", [path.join(workDirectory, "node_modules/@swc/cli/bin/swc.js"), "src", "--out-dir", "dist", "--strip-leading-paths", "--config-file", ".swcrc"], { cwd: consumerDirectory });
				}

				run("node", ["dist/main.js"], { cwd: consumerDirectory, env: { ...process.env, DATABASE_URL: database.url } });
			} catch {
				failed = true;
				process.stdout.write(`consumer ${consumer.name} app ${app} FAILED\n`);
			}
		}
	}
} catch (error) {
	failed = true;
	process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
} finally {
	await database?.stop();

	if (ARGS.has("--keep")) {
		process.stdout.write(`Kept ${workDirectory}\n`);
	} else {
		rmSync(workDirectory, { force: true, recursive: true });
	}
}

process.exitCode = failed ? 1 : 0;
