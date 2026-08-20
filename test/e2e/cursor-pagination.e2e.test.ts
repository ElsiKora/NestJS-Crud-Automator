import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";

import { HttpStatus } from "@nestjs/common";
import { APP_PIPE } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiSubscriberModule } from "../../src/index";
import { e2eHookPermissionSource } from "./app/hook-permission-source";
import { e2eAuthorizationPrincipalResolver } from "./app/principal-resolver";
import { E2eValidationPipe } from "./app/validation-pipe";
import { CursorPaginationController } from "./cursor-pagination/controller";
import { CursorPaginationEntity } from "./cursor-pagination/entity";
import { CursorPaginationFixedOrderController } from "./cursor-pagination/fixed-order.controller";
import { CursorPaginationService } from "./cursor-pagination/service";
import { CursorPaginationSubscriber } from "./cursor-pagination/subscriber";
import { ECursorPaginationState } from "./cursor-pagination/state.enum";

const ITEM_A_ID: string = "00000000-0000-0000-0000-000000000001";
const ITEM_B_ID: string = "00000000-0000-0000-0000-000000000002";
const ITEM_C_ID: string = "00000000-0000-0000-0000-000000000003";
const ITEM_D_ID: string = "00000000-0000-0000-0000-000000000004";
const ITEM_E_ID: string = "00000000-0000-0000-0000-000000000005";

describe("generated CURSOR pagination (E2E)", () => {
	let app: INestApplication | undefined;
	let container: StartedPostgreSqlContainer;
	let service: CursorPaginationService;
	let fastify: { inject: (options: { method: string; url: string }) => Promise<{ json: () => unknown; statusCode: number }> };

	beforeAll(async () => {
		container = await new PostgreSqlContainer("postgres:17-alpine").start();
		const moduleReference = await Test.createTestingModule({
			controllers: [CursorPaginationController, CursorPaginationFixedOrderController],
			imports: [
				TypeOrmModule.forRoot({
					dropSchema: true,
					entities: [CursorPaginationEntity],
					synchronize: true,
					type: "postgres",
					url: container.getConnectionUri(),
				}),
				TypeOrmModule.forFeature([CursorPaginationEntity]),
				ApiAuthorizationModule.forRoot({
					hookPermissionSources: [e2eHookPermissionSource],
					principalResolver: e2eAuthorizationPrincipalResolver,
				}),
				ApiSubscriberModule,
			],
			providers: [{ provide: APP_PIPE, useClass: E2eValidationPipe }, CursorPaginationService, CursorPaginationSubscriber],
		}).compile();

		app = moduleReference.createNestApplication(new FastifyAdapter());
		await app.init();
		service = app.get(CursorPaginationService);
		fastify = app.getHttpAdapter().getInstance();
	}, 120_000);

	beforeEach(async () => {
		CursorPaginationSubscriber.reset();
		await service.reset();
		await service.repository.save([
			{ active: false, generation: "-9007199254740993", group: 1, id: ITEM_A_ID, rank: 1, smallRank: 1, state: ECursorPaginationState.ACTIVE },
			{ active: false, generation: "-9007199254740992", group: 1, id: ITEM_B_ID, rank: 1, smallRank: 1, state: ECursorPaginationState.INACTIVE },
			{ active: true, generation: "0", group: 1, id: ITEM_C_ID, rank: 2, smallRank: 2, state: ECursorPaginationState.ACTIVE },
			{ active: true, generation: "9007199254740992", group: 1, id: ITEM_D_ID, rank: 2, smallRank: 2, state: ECursorPaginationState.INACTIVE },
			{ active: true, generation: "9007199254740993", group: 1, id: ITEM_E_ID, rank: 3, smallRank: 3, state: ECursorPaginationState.ACTIVE },
		]);
	});

	afterAll(async () => {
		await app?.close();
		await container?.stop();
	});

	it("returns flat cursor windows and navigates backward", async () => {
		const firstResponse = await fastify.inject({ method: "GET", url: "/cursor-items?limit=2" });
		const first = firstResponse.json() as { items: Array<{ id: string }>; nextCursor: null | string; previousCursor: null | string };

		expect(firstResponse.statusCode).toBe(HttpStatus.OK);
		expect(Object.keys(first).toSorted()).toEqual(["items", "nextCursor", "previousCursor"]);
		expect(first.items.map(({ id }): string => id)).toEqual([ITEM_A_ID, ITEM_B_ID]);
		expect(first.nextCursor).toEqual(expect.any(String));
		expect(first.previousCursor).toBeNull();

		const secondResponse = await fastify.inject({ method: "GET", url: `/cursor-items?limit=2&after=${String(first.nextCursor)}` });
		const second = secondResponse.json() as typeof first;

		expect(secondResponse.statusCode).toBe(HttpStatus.OK);
		expect(second.items.map(({ id }): string => id)).toEqual([ITEM_C_ID, ITEM_D_ID]);
		expect(second.nextCursor).toEqual(expect.any(String));
		expect(second.previousCursor).toEqual(expect.any(String));

		const previousResponse = await fastify.inject({ method: "GET", url: `/cursor-items?limit=2&before=${String(second.previousCursor)}` });
		const previous = previousResponse.json() as typeof first;

		expect(previousResponse.statusCode).toBe(HttpStatus.OK);
		expect(previous.items.map(({ id }): string => id)).toEqual([ITEM_A_ID, ITEM_B_ID]);
		expect(previous.previousCursor).toBeNull();
		expect(previous.nextCursor).toEqual(expect.any(String));
	});

	it("uses a fixed primary-key cursor order when no client order fields are enabled", async () => {
		const firstResponse = await fastify.inject({ method: "GET", url: "/cursor-fixed-order-items?limit=2" });
		const first = firstResponse.json() as { items: Array<{ id: string }>; nextCursor: null | string; previousCursor: null | string };

		expect(firstResponse.statusCode).toBe(HttpStatus.OK);
		expect(first.items.map(({ id }): string => id)).toEqual([ITEM_A_ID, ITEM_B_ID]);
		expect(first.nextCursor).toEqual(expect.any(String));
		expect(first.previousCursor).toBeNull();

		const secondResponse = await fastify.inject({ method: "GET", url: `/cursor-fixed-order-items?limit=2&after=${String(first.nextCursor)}` });
		const second = secondResponse.json() as typeof first;

		expect(secondResponse.statusCode).toBe(HttpStatus.OK);
		expect(second.items.map(({ id }): string => id)).toEqual([ITEM_C_ID, ITEM_D_ID]);
		expect(second.previousCursor).toEqual(expect.any(String));

		const previousResponse = await fastify.inject({ method: "GET", url: `/cursor-fixed-order-items?limit=2&before=${String(second.previousCursor)}` });
		const previous = previousResponse.json() as typeof first;

		expect(previousResponse.statusCode).toBe(HttpStatus.OK);
		expect(previous.items.map(({ id }): string => id)).toEqual([ITEM_A_ID, ITEM_B_ID]);

		const clientOrderResponses = await Promise.all([fastify.inject({ method: "GET", url: "/cursor-fixed-order-items?limit=2&orderBy=rank" }), fastify.inject({ method: "GET", url: "/cursor-fixed-order-items?limit=2&orderDirection=asc" }), fastify.inject({ method: "GET", url: "/cursor-fixed-order-items?limit=2&orderBy=rank&orderDirection=asc" })]);

		expect(clientOrderResponses.map(({ statusCode }): number => statusCode)).toEqual([HttpStatus.BAD_REQUEST, HttpStatus.BAD_REQUEST, HttpStatus.BAD_REQUEST]);
	});

	it("binds cursors to the route filter and effective order", async () => {
		const firstResponse = await fastify.inject({ method: "GET", url: "/cursor-items?limit=2" });
		const first = firstResponse.json() as { nextCursor: string };

		const filterMismatch = await fastify.inject({ method: "GET", url: `/cursor-items?limit=2&after=${first.nextCursor}&group[operator]=eq&group[value]=2` });
		const orderMismatch = await fastify.inject({ method: "GET", url: `/cursor-items?limit=2&after=${first.nextCursor}&orderBy=rank&orderDirection=desc` });

		expect(filterMismatch.statusCode).toBe(HttpStatus.BAD_REQUEST);
		expect(orderMismatch.statusCode).toBe(HttpStatus.BAD_REQUEST);
	});

	it("supports descending client order with the primary-key tie-breaker", async () => {
		const firstResponse = await fastify.inject({ method: "GET", url: "/cursor-items?limit=2&orderBy=rank&orderDirection=desc" });
		const first = firstResponse.json() as { items: Array<{ id: string }>; nextCursor: null | string; previousCursor: null | string };

		expect(firstResponse.statusCode).toBe(HttpStatus.OK);
		expect(first.items.map(({ id }): string => id)).toEqual([ITEM_E_ID, ITEM_C_ID]);

		const secondResponse = await fastify.inject({ method: "GET", url: `/cursor-items?limit=2&orderBy=rank&orderDirection=desc&after=${String(first.nextCursor)}` });
		const second = secondResponse.json() as typeof first;

		expect(secondResponse.statusCode).toBe(HttpStatus.OK);
		expect(second.items.map(({ id }): string => id)).toEqual([ITEM_D_ID, ITEM_A_ID]);

		const previousResponse = await fastify.inject({ method: "GET", url: `/cursor-items?limit=2&orderBy=rank&orderDirection=desc&before=${String(second.previousCursor)}` });
		const previous = previousResponse.json() as typeof first;

		expect(previousResponse.statusCode).toBe(HttpStatus.OK);
		expect(previous.items.map(({ id }): string => id)).toEqual([ITEM_E_ID, ITEM_C_ID]);
	});

	it("preserves signed PostgreSQL bigint order values outside the safe Number range", async () => {
		const firstResponse = await fastify.inject({ method: "GET", url: "/cursor-items?limit=2&orderBy=generation&orderDirection=asc" });
		const first = firstResponse.json() as { items: Array<{ generation: string; id: string }>; nextCursor: null | string; previousCursor: null | string };

		expect(firstResponse.statusCode).toBe(HttpStatus.OK);
		expect(first.items.map(({ generation }): string => generation)).toEqual(["-9007199254740993", "-9007199254740992"]);

		const secondResponse = await fastify.inject({ method: "GET", url: `/cursor-items?limit=2&orderBy=generation&orderDirection=asc&after=${String(first.nextCursor)}` });
		const second = secondResponse.json() as typeof first;

		expect(secondResponse.statusCode).toBe(HttpStatus.OK);
		expect(second.items.map(({ generation }): string => generation)).toEqual(["0", "9007199254740992"]);

		const previousResponse = await fastify.inject({ method: "GET", url: `/cursor-items?limit=2&orderBy=generation&orderDirection=asc&before=${String(second.previousCursor)}` });
		const previous = previousResponse.json() as typeof first;

		expect(previousResponse.statusCode).toBe(HttpStatus.OK);
		expect(previous.items.map(({ generation }): string => generation)).toEqual(["-9007199254740993", "-9007199254740992"]);
	});

	it("supports cursor order over PostgreSQL SERIAL-family generated integer and bigint columns", async () => {
		const columns: Array<{ columnDefault: null | string; columnName: string; dataType: string }> = (await service.repository.query(
			`SELECT column_name AS "columnName", data_type AS "dataType", column_default AS "columnDefault"
			 FROM information_schema.columns
			 WHERE table_schema = current_schema()
			   AND table_name = 'cursor_pagination_items'
			   AND column_name IN ('generatedInteger', 'generatedBigint')
			 ORDER BY column_name`,
		)) as Array<{ columnDefault: null | string; columnName: string; dataType: string }>;

		expect(columns).toEqual([
			{ columnDefault: expect.stringContaining("nextval"), columnName: "generatedBigint", dataType: "bigint" },
			{ columnDefault: expect.stringContaining("nextval"), columnName: "generatedInteger", dataType: "integer" },
		]);

		const integerFirstResponse = await fastify.inject({ method: "GET", url: "/cursor-items?limit=2&orderBy=generatedInteger&orderDirection=asc" });
		const integerFirst = integerFirstResponse.json() as { items: Array<{ generatedInteger: number }>; nextCursor: string };
		const integerStart: number = integerFirst.items[0]!.generatedInteger;

		expect(integerFirstResponse.statusCode).toBe(HttpStatus.OK);
		expect(integerFirst.items.map(({ generatedInteger }): number => generatedInteger)).toEqual([integerStart, integerStart + 1]);

		const integerSecondResponse = await fastify.inject({ method: "GET", url: `/cursor-items?limit=2&orderBy=generatedInteger&orderDirection=asc&after=${integerFirst.nextCursor}` });
		const integerSecond = integerSecondResponse.json() as typeof integerFirst;

		expect(integerSecondResponse.statusCode).toBe(HttpStatus.OK);
		expect(integerSecond.items.map(({ generatedInteger }): number => generatedInteger)).toEqual([integerStart + 2, integerStart + 3]);

		const bigintFirstResponse = await fastify.inject({ method: "GET", url: "/cursor-items?limit=2&orderBy=generatedBigint&orderDirection=asc" });
		const bigintFirst = bigintFirstResponse.json() as { items: Array<{ generatedBigint: string }>; nextCursor: string };
		const bigintStart: bigint = BigInt(bigintFirst.items[0]!.generatedBigint);

		expect(bigintFirstResponse.statusCode).toBe(HttpStatus.OK);
		expect(bigintFirst.items.map(({ generatedBigint }): string => generatedBigint)).toEqual([bigintStart.toString(), (bigintStart + 1n).toString()]);

		const bigintSecondResponse = await fastify.inject({ method: "GET", url: `/cursor-items?limit=2&orderBy=generatedBigint&orderDirection=asc&after=${bigintFirst.nextCursor}` });
		const bigintSecond = bigintSecondResponse.json() as typeof bigintFirst;

		expect(bigintSecondResponse.statusCode).toBe(HttpStatus.OK);
		expect(bigintSecond.items.map(({ generatedBigint }): string => generatedBigint)).toEqual([(bigintStart + 2n).toString(), (bigintStart + 3n).toString()]);
	});

	it("evaluates a nondeterministic GET_MANY candidate WHERE once and reuses it for the opposite probe", async () => {
		CursorPaginationSubscriber.shouldUseNondeterministicWhere = true;

		const firstResponse = await fastify.inject({ method: "GET", url: "/cursor-items?limit=2" });
		const first = firstResponse.json() as { items: Array<{ id: string }>; nextCursor: null | string; previousCursor: null | string };

		expect(firstResponse.statusCode).toBe(HttpStatus.OK);
		expect(first.items.map(({ id }): string => id)).toEqual([ITEM_C_ID, ITEM_D_ID]);
		expect(first.nextCursor).toEqual(expect.any(String));
		expect(CursorPaginationSubscriber.getManyBeforeCount).toBe(1);

		CursorPaginationSubscriber.getManyBeforeCount = 0;

		const secondResponse = await fastify.inject({ method: "GET", url: `/cursor-items?limit=2&after=${String(first.nextCursor)}` });
		const second = secondResponse.json() as typeof first;

		expect(secondResponse.statusCode).toBe(HttpStatus.OK);
		expect(second.items.map(({ id }): string => id)).toEqual([ITEM_E_ID]);
		expect(second.previousCursor).toEqual(expect.any(String));
		expect(CursorPaginationSubscriber.getManyBeforeCount).toBe(1);
	});

	it("rejects page, two directions, and non-canonical tokens", async () => {
		const firstResponse = await fastify.inject({ method: "GET", url: "/cursor-items?limit=2" });
		const first = firstResponse.json() as { nextCursor: string };
		const withPage = await fastify.inject({ method: "GET", url: "/cursor-items?limit=2&page=1" });
		const twoDirections = await fastify.inject({ method: "GET", url: `/cursor-items?limit=2&after=${first.nextCursor}&before=${first.nextCursor}` });
		const nonCanonical = await fastify.inject({ method: "GET", url: `/cursor-items?limit=2&after=${first.nextCursor}%3D` });

		expect(withPage.statusCode).toBe(HttpStatus.BAD_REQUEST);
		expect(twoDirections.statusCode).toBe(HttpStatus.BAD_REQUEST);
		expect(nonCanonical.statusCode).toBe(HttpStatus.BAD_REQUEST);
	});
});
