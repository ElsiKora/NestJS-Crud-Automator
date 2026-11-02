import type { INestApplication } from "@nestjs/common";
import type { TSwaggerComponentSchema, TSwaggerSchemaObject } from "@type/swagger";
import type { DataSourceOptions } from "typeorm";

import { HttpStatus } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiSubscriberModule, EApiControllerRelationReferenceShape } from "../../../src/index";
import { createRelationReferenceSchemaChecker, type IRelationReferenceSchemaChecker } from "../relation-reference-dto";

import { E2E_RELATION_SOFT_CASES, E2E_RELATION_SOFT_CONTROLLERS, E2E_RELATION_SOFT_CURSOR_CONTROLLER, E2E_RELATION_SOFT_CURSOR_PATH, type IE2eRelationSoftCase } from "./controller";
import { E2eRelationSoftPostEntity, E2eRelationSoftTargetEntity } from "./entity";
import { E2eRelationSoftPostService } from "./service";

const LIVE_TARGET_ID: string = "11111111-1111-4111-8111-111111111111";
const POST_DELETED: string = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2";
const POST_LIVE: string = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const SOFT_TARGET_ID: string = "11111111-1111-4111-8111-111111111112";

interface IE2eRelationSoftSuiteOptions {
	createDataSourceOptions: () => Promise<DataSourceOptions>;
	isCursorSupported: boolean;
	stop?: () => Promise<void>;
}

type TWirePost = Record<string, unknown> & { id: string };

/**
 * Registers the soft-deleted relation target suite for one database.
 * @param {string} name - Database name used in the suite title.
 * @param {IE2eRelationSoftSuiteOptions} options - Database options and capabilities.
 */
export function describeRelationSoftDeleteSuite(name: string, options: IE2eRelationSoftSuiteOptions): void {
	describe(`Response relations to a soft-deleted target on ${name} (E2E)`, () => {
		let app: INestApplication | undefined;
		let fastify: { inject: (request: { method: string; url: string }) => Promise<{ json: () => unknown; statusCode: number }> };
		let schemas: IRelationReferenceSchemaChecker;

		const inject = async (url: string): Promise<unknown> => {
			const response = await fastify.inject({ method: "GET", url });

			expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.OK);

			return response.json();
		};

		beforeAll(async () => {
			const moduleReference = await Test.createTestingModule({
				controllers: [...E2E_RELATION_SOFT_CONTROLLERS, ...(options.isCursorSupported ? [E2E_RELATION_SOFT_CURSOR_CONTROLLER] : [])],
				imports: [
					TypeOrmModule.forRoot({
						...(await options.createDataSourceOptions()),
						dropSchema: true,
						entities: [E2eRelationSoftPostEntity, E2eRelationSoftTargetEntity],
						logging: false,
						synchronize: true,
					} as DataSourceOptions),
					TypeOrmModule.forFeature([E2eRelationSoftPostEntity]),
					ApiAuthorizationModule.forRoot(),
					ApiSubscriberModule,
				],
				providers: [E2eRelationSoftPostService],
			}).compile();

			app = moduleReference.createNestApplication(new FastifyAdapter());
			await app.init();
			schemas = createRelationReferenceSchemaChecker(SwaggerModule.createDocument(app, new DocumentBuilder().build()));
			fastify = app.getHttpAdapter().getInstance();

			const { manager } = app.get(E2eRelationSoftPostService).repository;
			const liveTarget: E2eRelationSoftTargetEntity = await manager.save(E2eRelationSoftTargetEntity, { code: "live-target", id: LIVE_TARGET_ID });
			const softTarget: E2eRelationSoftTargetEntity = await manager.save(E2eRelationSoftTargetEntity, { code: "soft-target", id: SOFT_TARGET_ID });

			await manager.save(E2eRelationSoftPostEntity, [
				{ id: POST_LIVE, rank: 1, target: liveTarget, watcher: liveTarget },
				{ id: POST_DELETED, rank: 2, target: softTarget, watcher: softTarget },
			]);
			await manager.softRemove(E2eRelationSoftTargetEntity, softTarget);
		}, 120_000);

		afterAll(async () => {
			await app?.close();
			await options.stop?.();
		});

		describe.each(E2E_RELATION_SOFT_CASES)("$shape on $key", ({ key, path, shape }: IE2eRelationSoftCase) => {
			const live: unknown = ((value: string): unknown => (shape === EApiControllerRelationReferenceShape.SCALAR ? value : { [key]: value }))(key === "id" ? LIVE_TARGET_ID : "live-target");

			it("GET sends null for a soft-deleted target, and the schema allows it", async () => {
				const liveBody: unknown = await inject(`/${path}/${POST_LIVE}`);
				const deletedBody: unknown = await inject(`/${path}/${POST_DELETED}`);
				const schema: TSwaggerComponentSchema = schemas.getResponseSchema(path, false);

				expect(liveBody).toMatchObject({ target: live, watcher: { id: LIVE_TARGET_ID } });
				expect(deletedBody).toMatchObject({ target: null, watcher: null });
				schemas.expectWireMatchesSchema(schema, liveBody, "live");
				schemas.expectWireMatchesSchema(schema, deletedBody, "deleted");
			});

			it("GET_LIST sends null for a soft-deleted target, and the schema allows it", async () => {
				const body = (await inject(`/${path}?limit=10&page=1&orderBy=rank&orderDirection=asc`)) as { items: Array<TWirePost> };

				expect(body.items.find((post: TWirePost): boolean => post.id === POST_LIVE)).toMatchObject({ target: live });
				expect(body.items.find((post: TWirePost): boolean => post.id === POST_DELETED)).toMatchObject({ target: null, watcher: null });
				schemas.expectWireMatchesSchema(schemas.getResponseSchema(path, true), body, "list");
			});

			it("describes both to-one relations as nullable", () => {
				const properties: Record<string, TSwaggerComponentSchema> = schemas.getItemProperties(path, false);
				const target: TSwaggerSchemaObject = schemas.resolveSchema(properties.target as TSwaggerComponentSchema);

				expect(target.nullable).toBe(true);
				expect(schemas.resolveSchema(properties.watcher as TSwaggerComponentSchema).nullable).toBe(true);
			});
		});

		it.runIf(options.isCursorSupported)("CURSOR GET_LIST matches its schema for a live and a soft-deleted target", async () => {
			const body = (await inject(`/${E2E_RELATION_SOFT_CURSOR_PATH}?limit=10`)) as { items: Array<TWirePost> };

			expect(body.items.map(({ id, target }: TWirePost): unknown => [id, target])).toEqual([
				[POST_LIVE, { code: "live-target" }],
				[POST_DELETED, null],
			]);
			schemas.expectWireMatchesSchema(schemas.getResponseSchema(E2E_RELATION_SOFT_CURSOR_PATH, true), body, "cursor");
		});
	});
}
