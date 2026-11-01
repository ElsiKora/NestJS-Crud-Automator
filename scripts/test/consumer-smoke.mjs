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
 * DATABASE_URL selects an existing database; otherwise a testcontainers Postgres is started and removed afterwards.
 *
 * Flags: --skip-build reuses the current dist, --keep leaves the temporary project in place.
 */
import { execFileSync } from "node:child_process";
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
const ARGS = new Set(process.argv.slice(2));

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
	const dependencies = { "@elsikora/nestjs-crud-automator": `file:${tarball}`, "@types/node": TYPES_NODE_RANGE, "reflect-metadata": repositoryManifest.dependencies["reflect-metadata"], rxjs: repositoryManifest.dependencies.rxjs, ...SWC_TOOLCHAIN };

	for (const name of STACK) {
		const version = repositoryManifest.devDependencies[name];

		if (!version) {
			throw new Error(`The repository has no devDependency ${name} to pin the consumer stack to`);
		}

		dependencies[name] = version;
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

	for (const name of ABSENT_PACKAGES) {
		if (existsSync(path.join(workDirectory, "node_modules", name))) {
			throw new Error(`The consumer project must not have ${name}`);
		}
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
