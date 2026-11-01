import "reflect-metadata";

import type { NestFastifyApplication } from "@nestjs/platform-fastify";

import assert from "node:assert/strict";

import { apiSubscriberRegistry, CorrelationIDResponseBodyInterceptor } from "@elsikora/nestjs-crud-automator";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

import { SmokeItemEntity, SmokeOwnerEntity } from "./entity.js";
import { SmokeAppModule } from "./module.js";
import { SmokeItemService } from "./service.js";
import { SMOKE_EVENTS } from "./subscriber.js";

type TResponse = { json: () => any; statusCode: number };

const OWNER_A: string = "00000000-0000-4000-8000-00000000000a";
const OWNER_B: string = "00000000-0000-4000-8000-00000000000b";
const MEMBER_A: Record<string, string> = { "x-roles": "member", "x-user-id": OWNER_A };
const itemId = (index: number): string => `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
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
		results.push(`FAIL ${name}: ${error instanceof Error ? error.message.split("\n").slice(0, 8).join(" | ") : String(error)}`);
	}
}

/**
 * Boots the application on the packed package and checks every scenario against Postgres.
 * @returns {Promise<void>}
 */
async function main(): Promise<void> {
	const app: NestFastifyApplication = await NestFactory.create<NestFastifyApplication>(SmokeAppModule, new FastifyAdapter(), { logger: ["error"] });

	app.useGlobalInterceptors(new CorrelationIDResponseBodyInterceptor());
	await app.init();
	await app.getHttpAdapter().getInstance().ready();

	const inject = async (options: { headers?: Record<string, string>; method: string; payload?: unknown; url: string }): Promise<TResponse> =>
		(await app
			.getHttpAdapter()
			.getInstance()
			.inject(options as never)) as unknown as TResponse;
	const service: SmokeItemService = app.get(SmokeItemService);
	const reset = async (): Promise<void> => {
		await service.repository.query('TRUNCATE "smoke_items", "smoke_owners"');
		await service.repository.manager.save(SmokeOwnerEntity, [
			{ id: OWNER_A, name: "Owner A" },
			{ id: OWNER_B, name: "Owner B" },
		]);
		SMOKE_EVENTS.length = 0;
	};
	const seed = async (items: Array<{ count: number; index: number; name: string; ownerId: string }>): Promise<void> => {
		await service.repository.save(items.map(({ count, index, name, ownerId }): Partial<SmokeItemEntity> => ({ count, id: itemId(index), name, ownerId })));
	};

	await scenario("generated CRUD routes run function and route subscribers", async () => {
		await reset();
		const created: TResponse = await inject({ headers: MEMBER_A, method: "POST", payload: { count: 1, id: itemId(1), name: "Item", ownerId: OWNER_A }, url: "/items" });

		assert.equal(created.statusCode, 201, JSON.stringify(created.json()));
		assert.equal(created.json().name, "fn-Item");
		assert.equal((await inject({ headers: MEMBER_A, method: "GET", url: `/items/${itemId(1)}` })).statusCode, 200);
		const patched: TResponse = await inject({ headers: MEMBER_A, method: "PATCH", payload: { name: "Patched" }, url: `/items/${itemId(1)}` });

		assert.equal(patched.statusCode, 200, JSON.stringify(patched.json()));
		assert.equal(patched.json().name, "Patched");
		assert.equal((await inject({ headers: MEMBER_A, method: "DELETE", url: `/items/${itemId(1)}` })).statusCode, 204);
		const missing: TResponse = await inject({ headers: MEMBER_A, method: "GET", url: `/items/${itemId(1)}` });

		assert.equal(missing.statusCode, 404);
		assert.equal(missing.json().error, "Not Found");

		for (const event of ["function:before:create", "route:after:create", "function:after:get", "function:after:update", "function:after:delete"]) {
			assert.ok(SMOKE_EVENTS.includes(event), `missing ${event} in ${SMOKE_EVENTS.join(",")}`);
		}
	});

	await scenario("eager owner relation is loaded by the service and returned by GET", async () => {
		await reset();
		await seed([{ count: 1, index: 2, name: "Eager", ownerId: OWNER_A }]);

		assert.equal((await service.get({ where: { id: itemId(2) } })).owner.name, "Owner A");
		const response: TResponse = await inject({ headers: MEMBER_A, method: "GET", url: `/items/${itemId(2)}` });

		assert.equal(response.statusCode, 200, JSON.stringify(response.json()));
		assert.equal(response.json().owner?.id, OWNER_A);
	});

	await scenario("IAM route without an attached policy answers 403", async () => {
		const response: TResponse = await inject({ headers: MEMBER_A, method: "GET", url: "/iam-items?limit=10&page=1" });

		// Guard exceptions are thrown before CorrelationIDResponseBodyInterceptor runs, so the body is Nest's own.
		// PENDING guard-filter branch: it pins today's guard body { message, statusCode }; expect correlationID, timestamp and error once that lands
		assert.equal(response.statusCode, 403, JSON.stringify(response.json()));
		assert.equal(response.json().message, "Forbidden");
	});

	await scenario("HOOKS policy denies a caller without the role and scopes members to their owner", async () => {
		await reset();
		await seed([
			{ count: 1, index: 3, name: "Mine", ownerId: OWNER_A },
			{ count: 2, index: 4, name: "Theirs", ownerId: OWNER_B },
		]);

		assert.equal((await inject({ headers: { "x-user-id": OWNER_A }, method: "GET", url: "/items?limit=10&page=1" })).statusCode, 403);
		assert.equal((await inject({ headers: MEMBER_A, method: "GET", url: `/items/${itemId(4)}` })).statusCode, 404);
		const list: TResponse = await inject({ headers: MEMBER_A, method: "GET", url: "/items?limit=10&page=1" });

		assert.equal(list.statusCode, 200, JSON.stringify(list.json()));
		assert.deepEqual(
			list.json().items.map((item: { id: string }): string => item.id),
			[itemId(3)],
		);
	});

	await scenario("typed filter is AND-merged with the authorization scope", async () => {
		await reset();
		await seed([
			{ count: 1, index: 5, name: "Keep", ownerId: OWNER_A },
			{ count: 2, index: 6, name: "Target", ownerId: OWNER_A },
			{ count: 3, index: 7, name: "Target", ownerId: OWNER_B },
		]);
		const response: TResponse = await inject({ headers: MEMBER_A, method: "GET", url: "/items?limit=10&page=1&name[operator]=eq&name[value]=Target" });

		assert.equal(response.statusCode, 200, JSON.stringify(response.json()));
		assert.deepEqual(
			response.json().items.map((item: { id: string }): string => item.id),
			[itemId(6)],
		);
		assert.equal((await inject({ headers: MEMBER_A, method: "GET", url: "/items?limit=10&page=1&count[operator]=eq&count[value]=1" })).statusCode, 400);
	});

	await scenario("PAGE and CURSOR pagination", async () => {
		await reset();
		await seed([1, 2, 3, 4, 5].map((count: number): { count: number; index: number; name: string; ownerId: string } => ({ count, index: 10 + count, name: `Page ${String(count)}`, ownerId: OWNER_A })));
		const page: TResponse = await inject({ headers: MEMBER_A, method: "GET", url: "/items?limit=2&page=2" });

		assert.equal(page.statusCode, 200, JSON.stringify(page.json()));
		assert.deepEqual(
			page.json().items.map((item: { count: number }): number => item.count),
			[3, 4],
		);
		assert.equal(page.json().totalCount, 5);
		const first: TResponse = await inject({ method: "GET", url: "/cursor-items?limit=2" });

		assert.equal(first.statusCode, 200, JSON.stringify(first.json()));
		assert.deepEqual(
			first.json().items.map((item: { id: string }): string => item.id),
			[itemId(11), itemId(12)],
		);
		const second: TResponse = await inject({ method: "GET", url: `/cursor-items?limit=2&after=${String(first.json().nextCursor)}` });

		assert.deepEqual(
			second.json().items.map((item: { id: string }): string => item.id),
			[itemId(13), itemId(14)],
		);
		const previous: TResponse = await inject({ method: "GET", url: `/cursor-items?limit=2&before=${String(second.json().previousCursor)}` });

		assert.deepEqual(
			previous.json().items.map((item: { id: string }): string => item.id),
			[itemId(11), itemId(12)],
		);
	});

	await scenario("Swagger document describes the generated routes and error bodies", async () => {
		const document: { components?: { schemas?: Record<string, { properties?: Record<string, unknown> }> }; paths: Record<string, unknown> } = SwaggerModule.createDocument(app, new DocumentBuilder().build()) as never;

		for (const path of ["/items", "/items/{id}", "/cursor-items", "/iam-items"]) {
			assert.ok(path in document.paths, `missing ${path}`);
		}

		assert.ok(document.components?.schemas?.ExceptionNotFoundDTO?.properties?.error, "ExceptionNotFoundDTO has no error property");
	});

	await scenario("close() shuts down and removes the subscribers", async () => {
		await app.close();

		assert.equal(apiSubscriberRegistry.getFunctionSubscribers<SmokeItemEntity>(SmokeItemEntity.name).length, 0);
		assert.equal(apiSubscriberRegistry.getRouteSubscribers<SmokeItemEntity>(SmokeItemEntity.name).length, 0);
	});

	process.stdout.write(`${results.join("\n")}\n`);
	process.exitCode = results.length === 8 && results.every((line: string): boolean => line.startsWith("PASS")) ? 0 : 1;
}

main().catch((error: unknown) => {
	process.stderr.write(`${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`);
	process.exitCode = 1;
});
