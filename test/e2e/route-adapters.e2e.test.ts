import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type { Repository } from "typeorm";

import { Body, Controller, HttpStatus, Inject, Injectable, Param, Query, Req, RequestMethod, ValidationPipe } from "@nestjs/common";
import { ExpressAdapter } from "@nestjs/platform-express";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { ApiProperty } from "@nestjs/swagger";
import { Test } from "@nestjs/testing";
import { InjectRepository, TypeOrmModule } from "@nestjs/typeorm";
import { IsString } from "class-validator";
import { Column, Entity, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiController, ApiControllerObservable, ApiPropertyDescribe, ApiRouteCustom, ApiRouteSubscriber, ApiRouteSubscriberBase, ApiService, ApiServiceBase, ApiSubscriberModule, EApiControllerRequestTarget, EApiControllerRequestTransformerType, EApiDtoType, EApiPropertyDescribeType, EApiPropertyStringType } from "../../src/index";

type TCustomMethod = "DELETE" | "GET" | "PATCH" | "POST" | "PUT";

interface IEchoAnswer {
	body?: unknown;
	page?: unknown;
	parameters?: unknown;
	query?: unknown;
	requestQuery?: unknown;
}

interface IRequestTargets {
	body?: Record<string, unknown>;
	parameters?: Record<string, unknown>;
	query?: Record<string, unknown>;
}

const STRING_PROPERTY = { format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING } as const;

const ROUTE_PATH: string = "items/:id";
const OK_RESPONSE = { status: HttpStatus.OK, type: undefined } as const;

const QUERY_TRANSFORMER_REQUEST = {
	[EApiControllerRequestTarget.QUERY]: {
		transformers: [{ key: "page", type: EApiControllerRequestTransformerType.STATIC, value: "transformed" }],
	},
} as const;

@Entity("custom_route_adapter_items")
class CustomRouteAdapterItemEntity {
	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe({ ...STRING_PROPERTY, description: "id", exampleValue: "item-1" })
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({ ...STRING_PROPERTY, description: "name", exampleValue: "Item" })
	public name!: string;
}

class CustomRouteAdapterBodyDto {
	@ApiProperty()
	@IsString()
	public kind!: string;

	@IsString()
	public name!: string;
}

@Injectable()
@ApiService({ entity: CustomRouteAdapterItemEntity })
class CustomRouteAdapterItemService extends ApiServiceBase<CustomRouteAdapterItemEntity> {
	@InjectRepository(CustomRouteAdapterItemEntity)
	public readonly repository!: Repository<CustomRouteAdapterItemEntity>;
}

/**
 * Answers what the handler sees on each request target.
 * @param {Record<string, unknown>} query - Value of `@Query()`.
 * @param {unknown} page - Value of `@Query("page")`.
 * @param {Record<string, unknown>} parameters - Value of `@Param()`.
 * @param {unknown} body - Value of `@Body()`.
 * @param {{ query?: unknown }} request - Value of `@Req()`.
 * @returns {IEchoAnswer} The values, so a test can compare them.
 */
function echo(query: Record<string, unknown>, page: unknown, parameters: Record<string, unknown>, body: unknown, request: { query?: unknown }): IEchoAnswer {
	return { body, page, parameters, query, requestQuery: request.query };
}

@Controller("plain")
class CustomRouteAdapterPlainController {
	@Inject(CustomRouteAdapterItemService)
	public readonly service!: CustomRouteAdapterItemService;

	@ApiRouteCustom<CustomRouteAdapterItemEntity>({
		dto: { [EApiDtoType.BODY]: { discriminator: { mapping: { dto: CustomRouteAdapterBodyDto }, propertyName: "kind" }, type: [CustomRouteAdapterBodyDto] } },
		resource: { action: "items.discriminated", entity: CustomRouteAdapterItemEntity },
		response: OK_RESPONSE,
		route: { method: RequestMethod.POST, path: "discriminated" },
	} as never)
	public discriminated(@Body() body: CustomRouteAdapterBodyDto): { bodyClass: string; name: string } {
		return { bodyClass: body.constructor.name, name: body.name };
	}

	@ApiRouteCustom<CustomRouteAdapterItemEntity>({ resource: { action: "items.delete", entity: CustomRouteAdapterItemEntity }, response: OK_RESPONSE, route: { method: RequestMethod.DELETE, path: ROUTE_PATH } })
	public remove(@Query() query: Record<string, unknown>, @Query("page") page: unknown, @Param() parameters: Record<string, unknown>, @Body() body: unknown, @Req() request: { query?: unknown }): IEchoAnswer {
		return echo(query, page, parameters, body, request);
	}

	@ApiRouteCustom<CustomRouteAdapterItemEntity>({ resource: { action: "items.get", entity: CustomRouteAdapterItemEntity }, response: OK_RESPONSE, route: { method: RequestMethod.GET, path: ROUTE_PATH } })
	public read(@Query() query: Record<string, unknown>, @Query("page") page: unknown, @Param() parameters: Record<string, unknown>, @Body() body: unknown, @Req() request: { query?: unknown }): IEchoAnswer {
		return echo(query, page, parameters, body, request);
	}

	@ApiRouteCustom<CustomRouteAdapterItemEntity>({ resource: { action: "items.patch", entity: CustomRouteAdapterItemEntity }, response: OK_RESPONSE, route: { method: RequestMethod.PATCH, path: ROUTE_PATH } })
	public patch(@Query() query: Record<string, unknown>, @Query("page") page: unknown, @Param() parameters: Record<string, unknown>, @Body() body: unknown, @Req() request: { query?: unknown }): IEchoAnswer {
		return echo(query, page, parameters, body, request);
	}

	@ApiRouteCustom<CustomRouteAdapterItemEntity>({ resource: { action: "items.post", entity: CustomRouteAdapterItemEntity }, response: OK_RESPONSE, route: { method: RequestMethod.POST, path: ROUTE_PATH } })
	public post(@Query() query: Record<string, unknown>, @Query("page") page: unknown, @Param() parameters: Record<string, unknown>, @Body() body: unknown, @Req() request: { query?: unknown }): IEchoAnswer {
		return echo(query, page, parameters, body, request);
	}

	@ApiRouteCustom<CustomRouteAdapterItemEntity>({ resource: { action: "items.put", entity: CustomRouteAdapterItemEntity }, response: OK_RESPONSE, route: { method: RequestMethod.PUT, path: ROUTE_PATH } })
	public put(@Query() query: Record<string, unknown>, @Query("page") page: unknown, @Param() parameters: Record<string, unknown>, @Body() body: unknown, @Req() request: { query?: unknown }): IEchoAnswer {
		return echo(query, page, parameters, body, request);
	}

	@ApiRouteCustom<CustomRouteAdapterItemEntity>({ request: QUERY_TRANSFORMER_REQUEST, resource: { action: "items.transformed", entity: CustomRouteAdapterItemEntity }, response: OK_RESPONSE, route: { method: RequestMethod.GET, path: "transformed/:id" } } as never)
	public transformed(@Query() query: Record<string, unknown>, @Query("page") page: unknown, @Param() parameters: Record<string, unknown>, @Body() body: unknown, @Req() request: { query?: unknown }): IEchoAnswer {
		return echo(query, page, parameters, body, request);
	}
}

@ApiControllerObservable()
@Controller("observed")
class CustomRouteAdapterObservedController {
	@Inject(CustomRouteAdapterItemService)
	public readonly service!: CustomRouteAdapterItemService;

	@ApiRouteCustom<CustomRouteAdapterItemEntity>({ resource: { action: "items.delete", entity: CustomRouteAdapterItemEntity }, response: OK_RESPONSE, route: { method: RequestMethod.DELETE, path: ROUTE_PATH } })
	public remove(@Query() query: Record<string, unknown>, @Query("page") page: unknown, @Param() parameters: Record<string, unknown>, @Body() body: unknown, @Req() request: { query?: unknown }): IEchoAnswer {
		return echo(query, page, parameters, body, request);
	}

	@ApiRouteCustom<CustomRouteAdapterItemEntity>({ resource: { action: "items.get", entity: CustomRouteAdapterItemEntity }, response: OK_RESPONSE, route: { method: RequestMethod.GET, path: ROUTE_PATH } })
	public read(@Query() query: Record<string, unknown>, @Query("page") page: unknown, @Param() parameters: Record<string, unknown>, @Body() body: unknown, @Req() request: { query?: unknown }): IEchoAnswer {
		return echo(query, page, parameters, body, request);
	}

	@ApiRouteCustom<CustomRouteAdapterItemEntity>({ resource: { action: "items.patch", entity: CustomRouteAdapterItemEntity }, response: OK_RESPONSE, route: { method: RequestMethod.PATCH, path: ROUTE_PATH } })
	public patch(@Query() query: Record<string, unknown>, @Query("page") page: unknown, @Param() parameters: Record<string, unknown>, @Body() body: unknown, @Req() request: { query?: unknown }): IEchoAnswer {
		return echo(query, page, parameters, body, request);
	}

	@ApiRouteCustom<CustomRouteAdapterItemEntity>({ resource: { action: "items.post", entity: CustomRouteAdapterItemEntity }, response: OK_RESPONSE, route: { method: RequestMethod.POST, path: ROUTE_PATH } })
	public post(@Query() query: Record<string, unknown>, @Query("page") page: unknown, @Param() parameters: Record<string, unknown>, @Body() body: unknown, @Req() request: { query?: unknown }): IEchoAnswer {
		return echo(query, page, parameters, body, request);
	}

	@ApiRouteCustom<CustomRouteAdapterItemEntity>({ resource: { action: "items.put", entity: CustomRouteAdapterItemEntity }, response: OK_RESPONSE, route: { method: RequestMethod.PUT, path: ROUTE_PATH } })
	public put(@Query() query: Record<string, unknown>, @Query("page") page: unknown, @Param() parameters: Record<string, unknown>, @Body() body: unknown, @Req() request: { query?: unknown }): IEchoAnswer {
		return echo(query, page, parameters, body, request);
	}
}

@Injectable()
@ApiRouteSubscriber({ entity: CustomRouteAdapterItemEntity, priority: 1 })
class CustomRouteAdapterSubscriber extends ApiRouteSubscriberBase<CustomRouteAdapterItemEntity> {
	public async onBeforeCustom(context: { result: IRequestTargets }): Promise<IRequestTargets> {
		return {
			body: { ...context.result.body, name: "subscriber-name" },
			parameters: { ...context.result.parameters, id: "subscriber-id" },
			query: { ...context.result.query, page: "subscriber-page" },
		};
	}
}

@Entity("generated_route_adapter_items")
class GeneratedRouteAdapterItemEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({ ...STRING_PROPERTY, description: "name", exampleValue: "Item" })
	public name!: string;
}

@Injectable()
@ApiService({ entity: GeneratedRouteAdapterItemEntity })
class GeneratedRouteAdapterItemService extends ApiServiceBase<GeneratedRouteAdapterItemEntity> {
	@InjectRepository(GeneratedRouteAdapterItemEntity)
	public readonly repository!: Repository<GeneratedRouteAdapterItemEntity>;
}

@ApiController<GeneratedRouteAdapterItemEntity>({ entity: GeneratedRouteAdapterItemEntity, name: "GeneratedRouteAdapterItems", path: "generated", routes: {} })
class GeneratedRouteAdapterItemController {
	@Inject(GeneratedRouteAdapterItemService)
	public readonly service!: GeneratedRouteAdapterItemService;
}

const ADAPTERS: Array<[string, () => ExpressAdapter | FastifyAdapter]> = [
	["fastify", (): FastifyAdapter => new FastifyAdapter()],
	["express", (): ExpressAdapter => new ExpressAdapter()],
];

const MISSING_ID: string = "00000000-0000-4000-8000-000000000000";

const METHODS: Array<TCustomMethod> = ["GET", "POST", "PUT", "PATCH", "DELETE"];

describe.each(ADAPTERS)("routes on %s (E2E)", (_adapterName: string, createAdapter: () => ExpressAdapter | FastifyAdapter) => {
	let app: INestApplication;
	let baseUrl: string;

	const send = async (method: string, url: string, body?: unknown): Promise<{ answer: IEchoAnswer; status: number }> => {
		const response: Response = await fetch(`${baseUrl}${url}`, { ...(body === undefined ? {} : { body: JSON.stringify(body), headers: { "content-type": "application/json" } }), method });

		return { answer: (await response.json()) as IEchoAnswer, status: response.status };
	};

	beforeAll(async () => {
		const moduleReference = await Test.createTestingModule({
			controllers: [CustomRouteAdapterObservedController, CustomRouteAdapterPlainController, GeneratedRouteAdapterItemController],
			imports: [TypeOrmModule.forRoot({ database: ":memory:", dropSchema: true, entities: [CustomRouteAdapterItemEntity, GeneratedRouteAdapterItemEntity], synchronize: true, type: "better-sqlite3" }), TypeOrmModule.forFeature([CustomRouteAdapterItemEntity, GeneratedRouteAdapterItemEntity]), ApiAuthorizationModule.forRoot({}), ApiSubscriberModule],
			providers: [CustomRouteAdapterItemService, CustomRouteAdapterSubscriber, GeneratedRouteAdapterItemService],
		}).compile();

		app = moduleReference.createNestApplication(createAdapter());
		app.useGlobalPipes(new ValidationPipe({ forbidNonWhitelisted: true, transform: true, whitelist: true }));
		await app.listen(0, "127.0.0.1");
		baseUrl = (await app.getUrl()).replace("[::1]", "127.0.0.1");
	}, 60_000);

	afterAll(async () => {
		await app?.close();
	});

	it.each(METHODS)("%s answers 200 and the handler sees the request as sent", async (method: TCustomMethod) => {
		const { answer, status } = await send(method, "/plain/items/item-1?page=one", method === "GET" ? undefined : { name: "sent" });

		expect(status).toBe(HttpStatus.OK);
		expect(answer.query).toEqual({ page: "one" });
		expect(answer.page).toBe("one");
		expect(answer.requestQuery).toEqual({ page: "one" });
		expect(answer.parameters).toEqual({ id: "item-1" });

		if (method !== "GET") {
			expect(answer.body).toEqual({ name: "sent" });
		}
	});

	it.each(METHODS)("%s answers 200 and the handler sees what a BEFORE subscriber returned", async (method: TCustomMethod) => {
		const { answer, status } = await send(method, "/observed/items/item-1?page=one&limit=5", method === "GET" ? undefined : { name: "sent" });

		expect(status).toBe(HttpStatus.OK);
		expect(answer.query).toEqual({ limit: "5", page: "subscriber-page" });
		expect(answer.page).toBe("subscriber-page");
		expect(answer.requestQuery).toEqual({ limit: "5", page: "subscriber-page" });
		expect(answer.parameters).toEqual({ id: "subscriber-id" });
		expect(answer.body).toEqual({ name: "subscriber-name" });
	});

	it("keeps a query target transformer for the handler", async () => {
		const { answer, status } = await send("GET", "/plain/transformed/item-1?page=one");

		expect(status).toBe(HttpStatus.OK);
		expect(answer.query).toEqual({ page: "transformed" });
		expect(answer.page).toBe("transformed");
		expect(answer.requestQuery).toEqual({ page: "transformed" });
	});

	it("hands the handler the validated instance of a discriminated body", async () => {
		const { answer, status } = await send("POST", "/plain/discriminated", { kind: "dto", name: "sent" });

		expect(status).toBe(HttpStatus.OK);
		expect(answer).toEqual({ bodyClass: "CustomRouteAdapterBodyDto", name: "sent" });
	});

	it("runs generated routes through their whole life", async () => {
		const created = await send("POST", "/generated", { name: "Created" });
		const id: string = (created.answer as { id: string }).id;

		expect(created.status).toBe(HttpStatus.CREATED);
		expect(created.answer).toEqual({ id, name: "Created" });
		expect(await send("GET", `/generated/${id}`)).toEqual({ answer: { id, name: "Created" }, status: HttpStatus.OK });
		expect(await send("GET", "/generated?limit=10&page=1")).toEqual({ answer: { count: 1, currentPage: 1, items: [{ id, name: "Created" }], totalCount: 1, totalPages: 1 }, status: HttpStatus.OK });
		expect(await send("PATCH", `/generated/${id}`, { name: "Patched" })).toEqual({ answer: { id, name: "Patched" }, status: HttpStatus.OK });

		const removed: Response = await fetch(`${baseUrl}/generated/${id}`, { method: "DELETE" });

		expect(removed.status).toBe(HttpStatus.NO_CONTENT);
		expect(await removed.text()).toBe("");
	});

	it.each<[string, string, string, unknown, Array<string>]>([
		["a create body", "POST", "/generated", { name: 5 }, ["name must be a string", "name must match /^.+$/ regular expression", "name must be longer than or equal to 1 and shorter than or equal to 64 characters"]],
		["an update body", "PATCH", `/generated/${MISSING_ID}`, { name: 5 }, ["name must be a string", "name must match /^.+$/ regular expression", "name must be longer than or equal to 1 and shorter than or equal to 64 characters"]],
		["a list query value", "GET", "/generated?limit=abc&page=1", undefined, ["limit must be an integer number", "limit must not be less than 1", "limit must not be greater than 100", "limit must be divisible by 1"]],
		["an unknown list query key", "GET", "/generated?limit=10&page=1&unknown=1", undefined, ["property unknown should not exist"]],
		["a read path parameter", "GET", "/generated/not-a-uuid", undefined, ["id must be a UUID"]],
		["an update path parameter", "PATCH", "/generated/not-a-uuid", { name: "Two" }, ["id must be a UUID"]],
		["a delete path parameter", "DELETE", "/generated/not-a-uuid", undefined, ["id must be a UUID"]],
	])("refuses %s with the same 400", async (_name: string, method: string, url: string, body: unknown, message: Array<string>) => {
		expect(await send(method, url, body)).toEqual({ answer: { error: "Bad Request", message, statusCode: HttpStatus.BAD_REQUEST }, status: HttpStatus.BAD_REQUEST });
	});

	it.each<[string, string]>([
		["GET", `/generated/${MISSING_ID}`],
		["DELETE", `/generated/${MISSING_ID}`],
	])("answers %s of a missing row with the same 404", async (method: string, url: string) => {
		expect(await send(method, url)).toEqual({ answer: { error: "Not Found", message: "GENERATEDROUTEADAPTERITEMENTITY_NOT_FOUND", statusCode: HttpStatus.NOT_FOUND }, status: HttpStatus.NOT_FOUND });
	});
});
