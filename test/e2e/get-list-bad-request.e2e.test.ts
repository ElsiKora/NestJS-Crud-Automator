import "reflect-metadata";

import type { ExceptionFilter, INestApplication, NestInterceptor } from "@nestjs/common";
import type { OpenAPIObject } from "@nestjs/swagger";
import type { Repository } from "typeorm";

import { HttpStatus, Inject, Injectable, ValidationPipe } from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";
import { ExpressAdapter } from "@nestjs/platform-express";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { ApiProperty, DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Test } from "@nestjs/testing";
import { InjectRepository, TypeOrmModule } from "@nestjs/typeorm";
import { Ajv } from "ajv";
import addFormats from "ajv-formats";
import { Type } from "class-transformer";
import { IsInt } from "class-validator";
import { Column, Entity, PrimaryColumn } from "typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiController, ApiPropertyDescribe, ApiService, ApiServiceBase, ApiSubscriberModule, CorrelationIDResponseBodyExceptionFilter, CorrelationIDResponseBodyInterceptor, EApiControllerGetListQueryUnlistedFields, EApiControllerRequestTarget, EApiDtoType, EApiPropertyDescribeType, EApiPropertyNumberType, EApiPropertyStringType, EApiRouteType } from "../../src";

interface IBadRequestCase {
	isMessageArray: boolean;
	name: string;
	path: string;
	url: string;
}

interface ISetup {
	createFilters: (application: INestApplication) => Array<ExceptionFilter>;
	createInterceptors: () => Array<NestInterceptor>;
	hasCorrelationFields: boolean;
}

const OTHER_ROUTES_OFF = {
	[EApiRouteType.CREATE]: { generation: { isEnabled: false } },
	[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
	[EApiRouteType.GET]: { generation: { isEnabled: false } },
	[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
	[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
};

@Entity("get_list_bad_request_items")
class GetListBadRequestItemEntity {
	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe({ description: "id", exampleValue: "item-1", format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING })
	public id!: string;

	@Column({ type: "int" })
	@ApiPropertyDescribe({ description: "rank", exampleValue: 1, format: EApiPropertyNumberType.INTEGER, maximum: 100, minimum: 0, multipleOf: 1, type: EApiPropertyDescribeType.NUMBER })
	public rank!: number;
}

@Injectable()
@ApiService({ entity: GetListBadRequestItemEntity })
class GetListBadRequestItemService extends ApiServiceBase<GetListBadRequestItemEntity> {
	@InjectRepository(GetListBadRequestItemEntity)
	public readonly repository!: Repository<GetListBadRequestItemEntity>;
}

class GetListBadRequestManualQueryDto {
	@ApiProperty()
	@IsInt()
	@Type(() => Number)
	public limit!: number;
}

@ApiController<GetListBadRequestItemEntity>({ entity: GetListBadRequestItemEntity, name: "GetListBadRequestLegacy", path: "get-list-legacy", routes: OTHER_ROUTES_OFF })
class GetListBadRequestLegacyController {
	@Inject(GetListBadRequestItemService)
	public readonly service!: GetListBadRequestItemService;
}

@ApiController<GetListBadRequestItemEntity>({
	entity: GetListBadRequestItemEntity,
	name: "GetListBadRequestTyped",
	path: "get-list-typed",
	routes: { ...OTHER_ROUTES_OFF, [EApiRouteType.GET_LIST]: { request: { [EApiControllerRequestTarget.QUERY]: { order: { fields: { rank: { isEnabled: true } }, unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT } } } } },
})
class GetListBadRequestTypedController {
	@Inject(GetListBadRequestItemService)
	public readonly service!: GetListBadRequestItemService;
}

@ApiController<GetListBadRequestItemEntity>({
	entity: GetListBadRequestItemEntity,
	name: "GetListBadRequestManual",
	path: "get-list-manual",
	routes: { ...OTHER_ROUTES_OFF, [EApiRouteType.GET_LIST]: { dto: { [EApiDtoType.QUERY]: GetListBadRequestManualQueryDto } } } as never,
})
class GetListBadRequestManualController {
	@Inject(GetListBadRequestItemService)
	public readonly service!: GetListBadRequestItemService;
}

const BAD_REQUEST_CASES: Array<[string, IBadRequestCase]> = (
	[
		{ isMessageArray: true, name: "a legacy route with an unknown order field", path: "/get-list-legacy", url: "/get-list-legacy?limit=10&page=1&orderBy=unknown&orderDirection=asc" },
		{ isMessageArray: true, name: "a legacy route with an invalid limit", path: "/get-list-legacy", url: "/get-list-legacy?limit=bad&page=1" },
		{ isMessageArray: false, name: "a typed route with a one-sided order", path: "/get-list-typed", url: "/get-list-typed?limit=10&page=1&orderBy=rank" },
		{ isMessageArray: true, name: "a typed route with an unlisted order field", path: "/get-list-typed", url: "/get-list-typed?limit=10&page=1&orderBy=id&orderDirection=asc" },
		{ isMessageArray: true, name: "a manual QUERY route with an invalid limit", path: "/get-list-manual", url: "/get-list-manual?limit=bad" },
	] satisfies Array<IBadRequestCase>
).map((badRequestCase: IBadRequestCase): [string, IBadRequestCase] => [badRequestCase.name, badRequestCase]);

const ADAPTERS: Array<[string, () => ExpressAdapter | FastifyAdapter]> = [
	["fastify", () => new FastifyAdapter()],
	["express", () => new ExpressAdapter()],
];

const SETUPS: Array<[string, ISetup]> = [
	["without the interceptor", { createFilters: () => [], createInterceptors: () => [], hasCorrelationFields: false }],
	["with the interceptor", { createFilters: () => [], createInterceptors: () => [new CorrelationIDResponseBodyInterceptor()], hasCorrelationFields: true }],
	["with the interceptor and the filter", { createFilters: (application: INestApplication) => [new CorrelationIDResponseBodyExceptionFilter(application.get(HttpAdapterHost))], createInterceptors: () => [new CorrelationIDResponseBodyInterceptor()], hasCorrelationFields: true }],
];

/**
 * Drops OpenAPI `nullable: false`, its default, which Ajv rejects next to a schema combinator.
 * @param {unknown} value - Schema fragment.
 * @returns {unknown} The fragment without the flag.
 */
function withoutNonNullableFlags(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map((item: unknown): unknown => withoutNonNullableFlags(item));
	}

	if (value === null || typeof value !== "object") {
		return value;
	}

	return Object.fromEntries(
		Object.entries(value)
			.filter(([key, item]: [string, unknown]): boolean => key !== "nullable" || item !== false)
			.map(([key, item]: [string, unknown]): [string, unknown] => [key, withoutNonNullableFlags(item)]),
	);
}

describe.each(ADAPTERS)("GET_LIST 400 bodies on %s (E2E)", (_adapterName: string, createAdapter: () => ExpressAdapter | FastifyAdapter) => {
	describe.each(SETUPS)("%s", (_setupName: string, setup: ISetup) => {
		let app: INestApplication;
		let ajv: Ajv;
		let baseUrl: string;
		let document: OpenAPIObject;

		beforeAll(async () => {
			const moduleReference = await Test.createTestingModule({
				controllers: [GetListBadRequestLegacyController, GetListBadRequestManualController, GetListBadRequestTypedController],
				imports: [TypeOrmModule.forRoot({ database: ":memory:", dropSchema: true, entities: [GetListBadRequestItemEntity], synchronize: true, type: "better-sqlite3" }), TypeOrmModule.forFeature([GetListBadRequestItemEntity]), ApiAuthorizationModule.forRoot(), ApiSubscriberModule],
				providers: [GetListBadRequestItemService],
			}).compile();

			app = moduleReference.createNestApplication(createAdapter());
			app.useGlobalPipes(new ValidationPipe({ transform: true }));
			app.useGlobalInterceptors(...setup.createInterceptors());
			app.useGlobalFilters(...setup.createFilters(app));
			await app.listen(0, "127.0.0.1");
			baseUrl = (await app.getUrl()).replace("[::1]", "127.0.0.1");
			document = SwaggerModule.createDocument(app, new DocumentBuilder().build());

			ajv = new Ajv({ allErrors: true, discriminator: false, strict: false });
			addFormats(ajv);
			ajv.addFormat("int64", true);
			ajv.addFormat("string", true);
			ajv.addSchema({ components: withoutNonNullableFlags(document.components) }, "openapi");
		}, 60_000);

		afterAll(async () => {
			await app?.close();
		});

		it.each(BAD_REQUEST_CASES)("publishes the 400 body of %s", async (_name: string, badRequestCase: IBadRequestCase) => {
			const response: Response = await fetch(`${baseUrl}${badRequestCase.url}`);
			const body: { message?: unknown } = (await response.json()) as { message?: unknown };

			expect(response.status, JSON.stringify(body)).toBe(HttpStatus.BAD_REQUEST);
			expect(Array.isArray(body.message), JSON.stringify(body)).toBe(badRequestCase.isMessageArray);
			expect("correlationID" in body).toBe(setup.hasCorrelationFields);
			expect("timestamp" in body).toBe(setup.hasCorrelationFields);

			const reference: string | undefined = (document.paths[badRequestCase.path] as Record<string, { responses: Record<string, { content?: Record<string, { schema?: { $ref?: string } }> }> }>).get?.responses[String(HttpStatus.BAD_REQUEST)]?.content?.["application/json"]?.schema?.$ref;

			expect(reference).toBe("#/components/schemas/ExceptionBadRequestDTO");

			const validate = ajv.getSchema(`openapi${reference ?? ""}`);

			expect(validate?.(body), JSON.stringify(validate?.errors)).toBe(true);
		});

		it("requires no correlation field on the 400 schema", () => {
			const schemas = document.components?.schemas as Record<string, { required?: Array<string> }>;

			expect(schemas.ExceptionBadRequestDTO?.required?.toSorted()).toEqual(["message", "statusCode"]);
		});

		it("resolves every component reference", () => {
			const references: Array<string> = [...JSON.stringify(document).matchAll(/"#\/components\/schemas\/([^"]+)"/g)].map((match: RegExpExecArray): string => match[1] ?? "");

			expect(references.length).toBeGreaterThan(0);
			expect(references.filter((name: string): boolean => !document.components?.schemas?.[name])).toEqual([]);
		});
	});
});
