import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type { OpenAPIObject } from "@nestjs/swagger";

import { HttpStatus, Inject, ValidationPipe } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { ApiProperty, DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiController, ApiSubscriberModule, EApiControllerGetListQueryUnlistedFields, EApiControllerRequestTarget, EApiDtoType, EApiRouteType } from "../../src/index";
import { E2eListLazyCycleController, E2eListLazyCycleTypedController } from "./list-lazy-response/cycle";
import { E2eListLazyResponseItemEntity, E2eListLazyResponseItemService, E2eListLazySameFileController, E2eListLazySameFileCustomController, E2eListLazySameFileEmptyController, E2eListLazySameFileItemConfigController, E2eListLazySameFileTypedController } from "./list-lazy-response";
import { LIST_LAZY_RESPONSE_DISABLED_ROUTES } from "./list-lazy-response/routes";
import { E2eListOrderRuleItemController, E2eListOrderRuleItemEntity, E2eListOrderRuleItemService, E2eListOrderRuleOwnerEntity } from "./list-order-rule";

interface IHostPipeCase {
	createPipe?: () => ValidationPipe;
	name: string;
}

interface IOrderParameter {
	description?: string;
	name: string;
	required?: boolean;
	schema?: { enum?: Array<unknown>; example?: unknown; type?: string };
}

const PAGE: string = "limit=10&page=1";
const LAZY_ROUTES: Array<string> = ["/list-lazy-response/same-file", "/list-lazy-response/same-file-typed", "/list-lazy-response/same-file-item-config", "/list-lazy-response/cycle", "/list-lazy-response/cycle-typed"];

const getParameter = (document: OpenAPIObject, path: string, name: string): IOrderParameter | undefined => (document.paths[path]?.get?.parameters as Array<IOrderParameter> | undefined)?.find((candidate: IOrderParameter): boolean => candidate.name === name);

/**
 * Declares a controller whose typed order names a field the lazy response does not publish.
 * @returns {new () => unknown} The controller class.
 */
function createUnpublishedOrderController(): new () => unknown {
	class E2eListLazyUnpublishedListDto {
		@ApiProperty({ type: () => [E2eListLazyUnpublishedItemDto] })
		public items!: Array<unknown>;
	}

	@ApiController<E2eListLazyResponseItemEntity>({
		entity: E2eListLazyResponseItemEntity,
		name: "E2eListLazyUnpublished",
		path: "list-lazy-response/unpublished",
		routes: { ...LIST_LAZY_RESPONSE_DISABLED_ROUTES, [EApiRouteType.GET_LIST]: { dto: { [EApiDtoType.RESPONSE]: E2eListLazyUnpublishedListDto }, request: { [EApiControllerRequestTarget.QUERY]: { order: { fields: { rank: { isEnabled: true } }, unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT } } } } },
	})
	class E2eListLazyUnpublishedController {
		@Inject(E2eListLazyResponseItemService)
		public readonly service!: E2eListLazyResponseItemService;
	}

	class E2eListLazyUnpublishedItemDto {
		@ApiProperty({ type: String })
		public label!: string;
	}

	return E2eListLazyUnpublishedController;
}

/**
 * Declares a controller whose lazy response type never resolves to a class.
 * @returns {new () => unknown} The controller class.
 */
function createUnresolvableResponseController(): new () => unknown {
	class E2eListLazyUnresolvableListDto {
		@ApiProperty({ type: () => [undefined as unknown as new () => unknown] })
		public items!: Array<unknown>;
	}

	@ApiController<E2eListLazyResponseItemEntity>({
		entity: E2eListLazyResponseItemEntity,
		name: "E2eListLazyUnresolvable",
		path: "list-lazy-response/unresolvable",
		routes: { ...LIST_LAZY_RESPONSE_DISABLED_ROUTES, [EApiRouteType.GET_LIST]: { dto: { [EApiDtoType.RESPONSE]: E2eListLazyUnresolvableListDto } } },
	})
	class E2eListLazyUnresolvableController {
		@Inject(E2eListLazyResponseItemService)
		public readonly service!: E2eListLazyResponseItemService;
	}

	return E2eListLazyUnresolvableController;
}

describe("GET_LIST startup errors of a lazy list response (E2E)", () => {
	it("names the route when a typed order field is not published", () => {
		const controller: new () => unknown = createUnpublishedOrderController();

		expect(() => new controller()).toThrow('Controller "E2eListLazyUnpublishedController" route "getList": GET_LIST order field "rank" is not orderable: the manual GET_LIST response DTO does not publish it');
	});

	it("names the route when the response type never resolves", () => {
		const controller: new () => unknown = createUnresolvableResponseController();

		expect(() => new controller()).toThrow(/Controller "E2eListLazyUnresolvableController" route "getList": .*GET_LIST response DTO cannot be read/);
	});
});

describe.each<IHostPipeCase>([{ name: "no host pipe" }, { createPipe: () => new ValidationPipe(), name: "a default host ValidationPipe" }])("GET_LIST with a lazy list response and $name (E2E)", ({ createPipe }: IHostPipeCase) => {
	let app: INestApplication | undefined;
	let document: OpenAPIObject;
	let fastify: { inject: (options: { method: string; url: string }) => Promise<{ json: () => unknown; statusCode: number }> };

	beforeAll(async () => {
		const entities: Array<new () => unknown> = [E2eListLazyResponseItemEntity, E2eListOrderRuleItemEntity, E2eListOrderRuleOwnerEntity];
		const moduleReference = await Test.createTestingModule({
			controllers: [E2eListLazySameFileController, E2eListLazySameFileTypedController, E2eListLazySameFileItemConfigController, E2eListLazySameFileEmptyController, E2eListLazySameFileCustomController, E2eListLazyCycleController, E2eListLazyCycleTypedController, E2eListOrderRuleItemController],
			imports: [TypeOrmModule.forRoot({ database: ":memory:", dropSchema: true, entities, synchronize: true, type: "better-sqlite3" }), TypeOrmModule.forFeature(entities), ApiAuthorizationModule.forRoot(), ApiSubscriberModule],
			providers: [E2eListLazyResponseItemService, E2eListOrderRuleItemService],
		}).compile();

		app = moduleReference.createNestApplication(new FastifyAdapter());

		if (createPipe) {
			app.useGlobalPipes(createPipe());
		}

		await app.init();
		fastify = app.getHttpAdapter().getInstance();
		document = SwaggerModule.createDocument(app, new DocumentBuilder().build());

		await app.get(E2eListLazyResponseItemService).repository.save([
			{ label: "Beta", rank: 1 },
			{ label: "Alpha", rank: 2 },
		] as Array<E2eListLazyResponseItemEntity>);
	});

	afterAll(async () => {
		await app?.close();
	});

	it.each(LAZY_ROUTES)("publishes only the fields the lazy response has in the orderBy enum of %s", (path: string) => {
		expect(getParameter(document, path, "orderBy")?.schema?.enum).toEqual(["label"]);
		expect(getParameter(document, path, "orderDirection")?.schema?.enum).toEqual(["asc", "desc"]);
	});

	it("narrows the orderBy enum of a custom route to the lazy response", () => {
		expect(getParameter(document, "/list-lazy-response/same-file-custom", "orderBy")?.schema?.enum).toEqual(["label"]);
	});

	it("documents a deferred order parameter as an eager one", () => {
		const { schema: lazySchema, ...lazy }: IOrderParameter = getParameter(document, "/list-lazy-response/same-file", "orderBy") ?? { name: "" };
		const { schema: eagerSchema, ...eager }: IOrderParameter = getParameter(document, "/list-order-rule/items", "orderBy") ?? { name: "" };

		expect({ ...lazy, description: lazy.description?.replace("E2eListLazyResponseItemEntity", "") }).toEqual({ ...eager, description: eager.description?.replace("E2eListOrderRuleItemEntity", "") });
		expect(Object.keys(lazySchema ?? {}).toSorted()).toEqual(Object.keys(eagerSchema ?? {}).toSorted());
		expect(getParameter(document, "/list-lazy-response/same-file", "orderDirection")?.schema).toEqual(getParameter(document, "/list-order-rule/items", "orderDirection")?.schema);
	});

	it("documents no order parameters when the lazy response publishes no orderable field", () => {
		expect(getParameter(document, "/list-lazy-response/same-file-empty", "orderBy")).toBeUndefined();
		expect(getParameter(document, "/list-lazy-response/same-file-empty", "orderDirection")).toBeUndefined();
	});

	it.each(LAZY_ROUTES)("orders %s by a field the lazy response publishes", async (path: string) => {
		const response = await fastify.inject({ method: "GET", url: `${path}?${PAGE}&orderBy=label&orderDirection=asc` });

		expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.OK);
	});

	it.each(LAZY_ROUTES)("refuses a field the lazy response leaves out on %s", async (path: string) => {
		const response = await fastify.inject({ method: "GET", url: `${path}?${PAGE}&orderBy=rank&orderDirection=asc` });

		expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.BAD_REQUEST);
	});

	it.each(["orderBy=label&orderDirection=asc", "orderBy=label", "orderDirection=asc"])("refuses %s when the lazy response publishes no orderable field", async (order: string) => {
		const response = await fastify.inject({ method: "GET", url: `/list-lazy-response/same-file-empty?${PAGE}&${order}` });

		expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.BAD_REQUEST);
		expect(JSON.stringify(response.json())).toContain("is not accepted because no field of this route is orderable");
	});

	it.each(["/list-lazy-response/same-file", "/list-lazy-response/same-file-typed"])("refuses a one-sided order on %s", async (path: string) => {
		for (const order of ["orderBy=label", "orderDirection=asc"]) {
			const response = await fastify.inject({ method: "GET", url: `${path}?${PAGE}&${order}` });

			expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.BAD_REQUEST);
			expect(JSON.stringify(response.json())).toContain("ORDER_NOT_VALID");
		}
	});

	it.each(LAZY_ROUTES)("refuses an orderDirection in another case on %s", async (path: string) => {
		const response = await fastify.inject({ method: "GET", url: `${path}?${PAGE}&orderBy=label&orderDirection=ASC` });

		expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
	});

	it("names the published fields in the deferred validation message", async () => {
		const response = await fastify.inject({ method: "GET", url: `/list-lazy-response/same-file?${PAGE}&orderBy=rank&orderDirection=asc` });

		expect(JSON.stringify(response.json())).toContain("orderBy must be one of the following values: label");
	});

	if (createPipe) {
		it("applies the deferred fields under a host pipe on a custom route", async () => {
			const refused = await fastify.inject({ method: "GET", url: `/list-lazy-response/same-file-custom?${PAGE}&orderBy=rank&orderDirection=asc` });
			const accepted = await fastify.inject({ method: "GET", url: `/list-lazy-response/same-file-custom?${PAGE}&orderBy=label&orderDirection=asc` });

			expect(refused.statusCode).toBe(HttpStatus.BAD_REQUEST);
			expect(JSON.stringify(refused.json())).toContain("orderBy must be one of the following values: label");
			expect(accepted.statusCode, JSON.stringify(accepted.json())).toBe(HttpStatus.OK);
		});

		it("refuses an orderDirection in another case through the deferred DTO of a custom route", async () => {
			const response = await fastify.inject({ method: "GET", url: `/list-lazy-response/same-file-custom?${PAGE}&orderBy=label&orderDirection=ASC` });

			expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
		});

		it.each(["orderBy=label", "orderDirection=asc"])("rejects %s alone through the deferred DTO of a custom route", async (order: string) => {
			const response = await fastify.inject({ method: "GET", url: `/list-lazy-response/same-file-custom?${PAGE}&${order}` });

			expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.BAD_REQUEST);
			expect(JSON.stringify(response.json())).toContain("ORDER_NOT_VALID");
		});
	}
});
