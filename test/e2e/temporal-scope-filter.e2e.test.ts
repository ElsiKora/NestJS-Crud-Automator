import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";

import { HttpStatus } from "@nestjs/common";
import { APP_PIPE } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiSubscriberModule } from "../../src/index";
import { TestAuthGuard } from "./app/auth-guard";
import { e2eHookPermissionSource } from "./app/hook-permission-source";
import { e2eAuthorizationPrincipalResolver } from "./app/principal-resolver";
import { E2eValidationPipe } from "./app/validation-pipe";
import { E2E_TEMPORAL_STAMP_SCOPE_LIMIT, E2eTemporalStampController, E2eTemporalStampEntity, E2eTemporalStampPolicy, E2eTemporalStampService } from "./temporal-scope-filter";

type TStampRow = { id: string; stampedAt: string };
type TStampPage = { items: Array<TStampRow>; totalCount: number };

const ORIGINAL_TIMEZONE: string | undefined = process.env.TZ;
const PROCESS_TIMEZONE: string = "UTC";
const OWNER_ID: string = "10000000-0000-4000-8000-000000000001";
// Pre-standard-time offsets carry seconds in each zone: Moscow +02:30:17, New York -04:56:02, Kolkata +05:53:28.
const TIMEZONES: ReadonlyArray<string> = ["Europe/Moscow", "America/New_York", "Asia/Kolkata"];
const ROWS: ReadonlyArray<TStampRow> = Array.from({ length: 8 }, (_value: unknown, index: number): TStampRow => ({ id: `00000000-0000-4000-8000-${index.toString().padStart(12, "0")}`, stampedAt: new Date(Date.UTC(1800, 5, 1, 12, 0, index)).toISOString() }));

describe("a client filter and an authorization scope on the same transformed timestamptz column (E2E)", () => {
	let app: INestApplication | undefined;
	let container: StartedPostgreSqlContainer;
	let fastify: { inject: (options: { headers?: Record<string, string>; method: string; url: string }) => Promise<{ json: () => unknown; statusCode: number }> };

	const get = (url: string): Promise<{ json: () => unknown; statusCode: number }> => fastify.inject({ headers: { "x-user-id": OWNER_ID }, method: "GET", url });

	beforeAll(async () => {
		process.env.TZ = PROCESS_TIMEZONE;
		container = await new PostgreSqlContainer("postgres:17-alpine").start();
		const moduleReference = await Test.createTestingModule({
			controllers: [E2eTemporalStampController],
			imports: [TypeOrmModule.forRoot({ dropSchema: true, entities: [E2eTemporalStampEntity], synchronize: true, type: "postgres", url: container.getConnectionUri() }), TypeOrmModule.forFeature([E2eTemporalStampEntity]), ApiAuthorizationModule.forRoot({ hookPermissionSources: [e2eHookPermissionSource], principalResolver: e2eAuthorizationPrincipalResolver }), ApiSubscriberModule],
			providers: [{ provide: APP_PIPE, useClass: E2eValidationPipe }, E2eTemporalStampPolicy, E2eTemporalStampService, TestAuthGuard],
		}).compile();

		app = moduleReference.createNestApplication(new FastifyAdapter());
		await app.init();
		fastify = app.getHttpAdapter().getInstance();

		// Raw SQL keeps the fixture exact: the rows are inserted as UTC text, not through a Date.
		for (const [sequence, { id, stampedAt }] of ROWS.entries()) {
			await app.get(E2eTemporalStampService).repository.query(`INSERT INTO e2e_temporal_stamps (id, sequence, "stampedAt") VALUES ($1, $2, $3)`, [id, sequence, stampedAt]);
		}
	}, 120_000);

	afterAll(async () => {
		await app?.close();
		await container?.stop();

		if (ORIGINAL_TIMEZONE === undefined) {
			delete process.env.TZ;
		} else {
			process.env.TZ = ORIGINAL_TIMEZONE;
		}
	});

	it.each(TIMEZONES)("intersects the filter with the scope exactly in an %s process", async (timezone: string) => {
		process.env.TZ = timezone;

		try {
			const response = await get(`/temporal-stamps?limit=10&page=1&orderBy=sequence&orderDirection=ASC&stampedAt[operator]=gte&stampedAt[value]=${ROWS[2]?.stampedAt as string}`);
			const body: TStampPage = response.json() as TStampPage;
			const expected: Array<TStampRow> = ROWS.filter(({ stampedAt }: TStampRow): boolean => stampedAt >= (ROWS[2]?.stampedAt as string) && stampedAt < E2E_TEMPORAL_STAMP_SCOPE_LIMIT);

			expect(response.statusCode, JSON.stringify(body)).toBe(HttpStatus.OK);
			expect(body.items.map(({ id, stampedAt }: TStampRow): TStampRow => ({ id, stampedAt }))).toEqual(expected);
			expect(body.totalCount).toBe(expected.length);
		} finally {
			process.env.TZ = PROCESS_TIMEZONE;
		}
	});

	it("reads one row inside the scope and none outside it in a historic process zone", async () => {
		process.env.TZ = "Asia/Kolkata";

		try {
			expect((await get(`/temporal-stamps/${ROWS[4]?.id as string}`)).statusCode).toBe(HttpStatus.OK);
			expect((await get(`/temporal-stamps/${ROWS[5]?.id as string}`)).statusCode).toBe(HttpStatus.NOT_FOUND);
		} finally {
			process.env.TZ = PROCESS_TIMEZONE;
		}
	});
});
