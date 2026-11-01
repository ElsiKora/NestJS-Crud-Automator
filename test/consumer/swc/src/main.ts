import "reflect-metadata";

import type { NestFastifyApplication } from "@nestjs/platform-fastify";

import assert from "node:assert/strict";

import { CorrelationIDResponseBodyInterceptor } from "@elsikora/nestjs-crud-automator";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";

import { AppModule } from "./app.module";

type TResponse = { body: any; status: number };

const AUTHOR: string = "00000000-0000-4000-8000-0000000000c1";
const BOOK: string = "00000000-0000-4000-8000-0000000000d1";
const SCENARIO_COUNT: number = 3;
const results: Array<string> = [];

/**
 * Runs one scenario and records PASS or FAIL with the first lines of the error.
 * @param {string} name - Scenario name.
 * @param {() => Promise<void>} run - Scenario body.
 * @returns {Promise<void>}
 */
async function scenario(name: string, run: () => Promise<void>): Promise<void> {
	try {
		await run();
		results.push(`PASS ${name}`);
	} catch (error) {
		results.push(`FAIL ${name}: ${error instanceof Error ? error.message.split("\n").slice(0, 6).join(" | ") : String(error)}`);
	}
}

/**
 * Boots an application built by SWC to native ES modules, as with the Nest CLI SWC builder, and calls its generated routes over a socket.
 * @returns {Promise<void>}
 */
async function main(): Promise<void> {
	const app: NestFastifyApplication = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), { logger: ["error"] });

	app.useGlobalInterceptors(new CorrelationIDResponseBodyInterceptor());
	await app.listen(0, "127.0.0.1");

	const address: string = await app.getUrl();
	const request = async (method: string, path: string, payload?: unknown): Promise<TResponse> => {
		const response: Response = await fetch(`${address}${path}`, { body: payload === undefined ? undefined : JSON.stringify(payload), headers: payload === undefined ? {} : { "content-type": "application/json" }, method });
		const text: string = await response.text();

		return { body: text === "" ? undefined : JSON.parse(text), status: response.status };
	};

	await scenario("swc esm: create entities that import each other through generated routes", async () => {
		const author: TResponse = await request("POST", "/authors", { id: AUTHOR, name: "Ann" });

		assert.equal(author.status, 201, JSON.stringify(author.body));
		const book: TResponse = await request("POST", "/books", { author: AUTHOR, authorId: AUTHOR, id: BOOK, title: "Cycle" });

		assert.equal(book.status, 201, JSON.stringify(book.body));
		assert.deepEqual(book.body.author, { id: AUTHOR }, JSON.stringify(book.body));
	});

	await scenario("swc esm: GET and GET_LIST load the ManyToOne side of the cycle", async () => {
		const item: TResponse = await request("GET", `/books/${BOOK}`);

		assert.equal(item.status, 200, JSON.stringify(item.body));
		assert.deepEqual(item.body.author, { id: AUTHOR }, JSON.stringify(item.body));
		const list: TResponse = await request("GET", "/books?limit=10&page=1");

		assert.equal(list.status, 200, JSON.stringify(list.body));
		assert.equal(list.body.totalCount, 1, JSON.stringify(list.body));
	});

	await scenario("swc esm: error body from a generated route", async () => {
		const missing: TResponse = await request("GET", "/authors/00000000-0000-4000-8000-0000000000ff");

		assert.equal(missing.status, 404, JSON.stringify(missing.body));
		assert.equal(missing.body.error, "Not Found", JSON.stringify(missing.body));
	});

	await app.close();
	process.stdout.write(`${results.join("\n")}\n`);
	process.exitCode = results.length === SCENARIO_COUNT && results.every((line: string): boolean => line.startsWith("PASS")) ? 0 : 1;
}

main().catch((error: unknown) => {
	process.stderr.write(`${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`);
	process.exitCode = 1;
});
