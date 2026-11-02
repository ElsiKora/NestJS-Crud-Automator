import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type { Repository } from "typeorm";

import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Injectable, Post, Query, ValidationPipe } from "@nestjs/common";
import { APP_PIPE } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { InjectRepository, TypeOrmModule } from "@nestjs/typeorm";
import { IsNumber } from "class-validator";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiController, ApiPropertyDate, ApiPropertyDescribe, ApiPropertyNumber, ApiPropertyObject, ApiPropertyUUID, ApiService, ApiServiceBase, ApiSubscriberModule, EApiPropertyDateIdentifier, EApiPropertyDateType, EApiPropertyDescribeType, EApiPropertyNumberType, EApiPropertyStringType, EApiRouteType } from "../../src/index";

const UUID_FIRST: string = "6f1b0c7e-5c3b-4c0a-8a1a-0d6f3e2b1a11";
const UUID_SECOND: string = "7a2c1d8f-6d4c-4d1b-9b2b-1e7f4f3c2b22";
const ROW: { children: Array<{ id: number }>; labels: Array<string>; name: string } = { children: [{ id: 1 }], labels: ["first", "second"], name: "first" };

class E2eUniqueItemsChildDto {
	@IsNumber()
	public id!: number;
}

@Entity("e2e_unique_items_rows")
class E2eUniqueItemsEntity {
	@ApiPropertyDescribe({ description: "uniqueItemsRowId", type: EApiPropertyDescribeType.UUID })
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@ApiPropertyDescribe({ description: "uniqueItemsRowLabels", exampleValue: ["first", "second"], format: EApiPropertyStringType.STRING, isArray: true, isUniqueItems: true, maxItems: 3, maxLength: 10, minItems: 1, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING })
	@Column({ type: "simple-json" })
	public labels!: Array<string>;

	@ApiPropertyDescribe({ dataType: E2eUniqueItemsChildDto, description: "uniqueItemsRowChildren", isArray: true, isUniqueItems: true, maxItems: 3, minItems: 1, shouldValidateNested: true, type: EApiPropertyDescribeType.OBJECT })
	@Column({ nullable: true, type: "simple-json" })
	public children?: Array<E2eUniqueItemsChildDto>;

	@ApiPropertyDescribe({ description: "uniqueItemsRowName", exampleValue: "first", format: EApiPropertyStringType.STRING, isNullable: true, maxLength: 10, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING })
	@Column({ nullable: true, type: "varchar" })
	public name?: string;
}

@Injectable()
@ApiService({ entity: E2eUniqueItemsEntity })
class E2eUniqueItemsService extends ApiServiceBase<E2eUniqueItemsEntity> {
	@InjectRepository(E2eUniqueItemsEntity)
	public readonly repository!: Repository<E2eUniqueItemsEntity>;
}

@ApiController<E2eUniqueItemsEntity>({
	entity: E2eUniqueItemsEntity,
	name: "E2eUniqueItemsRows",
	path: "unique-items-rows",
	routes: {
		[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
	},
})
class E2eUniqueItemsRowController {
	public constructor(@Inject(E2eUniqueItemsService) public readonly service: E2eUniqueItemsService) {}
}

class E2eUniqueItemsQueryDto {
	@ApiPropertyNumber({ description: "uniques", entity: E2eUniqueItemsEntity, exampleValue: [2, 4], format: EApiPropertyNumberType.INTEGER, isArray: true, isRequired: true, isUniqueItems: true, maxItems: 3, maximum: 10, minItems: 1, minimum: 1, multipleOf: 1 })
	public uniques!: Array<number>;
}

class E2eUniqueItemsBodyDto {
	@ApiPropertyDate({ description: "dates", entity: E2eUniqueItemsEntity, format: EApiPropertyDateType.DATE_TIME, identifier: EApiPropertyDateIdentifier.DATE, isArray: true, isRequired: true, isUniqueItems: true, maxItems: 3, minItems: 1 })
	public dates!: Array<Date>;

	@ApiPropertyUUID({ description: "ids", entity: E2eUniqueItemsEntity, isArray: true, isRequired: true, isUniqueItems: true, maxItems: 3, minItems: 1 })
	public ids!: Array<string>;
}

class E2eUniqueItemsObjectsDto {
	@ApiPropertyObject({ description: "items", entity: E2eUniqueItemsEntity, isArray: true, isRequired: true, isUniqueItems: true, maxItems: 3, minItems: 1, shouldValidateNested: true, type: E2eUniqueItemsChildDto })
	public items!: Array<E2eUniqueItemsChildDto>;
}

class E2eUniqueItemsFreeFormDto {
	@ApiPropertyObject({ description: "items", entity: E2eUniqueItemsEntity, isArray: true, isRequired: true, isUniqueItems: true, maxItems: 3, minItems: 1, shouldValidateNested: true, type: Object })
	public items!: Array<unknown>;
}

@Controller("unique-items")
class E2eUniqueItemsManualController {
	@HttpCode(HttpStatus.OK)
	@Post()
	public body(@Body() body: E2eUniqueItemsBodyDto): { dates: number; ids: number } {
		return { dates: body.dates.length, ids: body.ids.length };
	}

	@HttpCode(HttpStatus.OK)
	@Post("free-form")
	public freeForm(@Body() body: E2eUniqueItemsFreeFormDto): { items: number } {
		return { items: body.items.length };
	}

	@HttpCode(HttpStatus.OK)
	@Post("objects")
	public objects(@Body() body: E2eUniqueItemsObjectsDto): { items: Array<E2eUniqueItemsChildDto> } {
		return { items: body.items };
	}

	@Get()
	public query(@Query() query: E2eUniqueItemsQueryDto): { uniques: Array<number> } {
		return { uniques: query.uniques };
	}
}

describe("isUniqueItems on request arrays (E2E)", () => {
	let app: INestApplication | undefined;
	let fastify: { inject: (options: { method: string; payload?: unknown; url: string }) => Promise<{ json: () => { id: string; items: Array<{ id: string }>; message?: unknown }; statusCode: number }> };

	beforeAll(async () => {
		const moduleReference = await Test.createTestingModule({
			controllers: [E2eUniqueItemsManualController, E2eUniqueItemsRowController],
			imports: [TypeOrmModule.forRoot({ database: ":memory:", dropSchema: true, entities: [E2eUniqueItemsEntity], logging: false, synchronize: true, type: "better-sqlite3" }), TypeOrmModule.forFeature([E2eUniqueItemsEntity]), ApiAuthorizationModule.forRoot(), ApiSubscriberModule],
			providers: [{ provide: APP_PIPE, useValue: new ValidationPipe({ transform: true, whitelist: true }) }, E2eUniqueItemsService],
		}).compile();

		app = moduleReference.createNestApplication(new FastifyAdapter());
		await app.init();
		fastify = app.getHttpAdapter().getInstance();
	});

	afterAll(async () => {
		await app?.close();
	});

	it("answers 400 for a repeated query value", async () => {
		const response = await fastify.inject({ method: "GET", url: "/unique-items?uniques=7&uniques=7" });

		expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
		expect(response.json().message).toEqual(["uniques must not contain duplicate items"]);
	});

	it("accepts distinct query values", async () => {
		const response = await fastify.inject({ method: "GET", url: "/unique-items?uniques=7&uniques=8" });

		expect(response.statusCode).toBe(HttpStatus.OK);
		expect(response.json()).toEqual({ uniques: [7, 8] });
	});

	it("answers 400 for two spellings of one instant and of one UUID in a body", async () => {
		const response = await fastify.inject({ method: "POST", payload: { dates: ["2026-01-01T00:00:00.000Z", "2026-01-01T03:00:00.000+03:00"], ids: [UUID_FIRST, UUID_FIRST.toUpperCase()] }, url: "/unique-items" });

		expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
		expect(response.json().message).toEqual(["dates must not contain duplicate items", "ids must not contain duplicate items"]);
	});

	it("accepts distinct body items", async () => {
		const response = await fastify.inject({ method: "POST", payload: { dates: ["2026-01-01T00:00:00.000Z", "2026-01-02T00:00:00.000Z"], ids: [UUID_FIRST, UUID_SECOND] }, url: "/unique-items" });

		expect(response.statusCode).toBe(HttpStatus.OK);
	});

	it("answers 400 on a generated CREATE route whose entity property declares isUniqueItems", async () => {
		const response = await fastify.inject({ method: "POST", payload: { ...ROW, labels: ["first", "first"] }, url: "/unique-items-rows" });

		expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
		expect(response.json().message).toEqual(["labels must not contain duplicate items"]);
	});

	it("creates the row on that route when its items are distinct", async () => {
		const response = await fastify.inject({ method: "POST", payload: ROW, url: "/unique-items-rows" });

		expect(response.statusCode).toBe(HttpStatus.CREATED);
		expect(response.json()).toEqual(expect.objectContaining({ labels: ["first", "second"] }));
	});

	const createRow = async (): Promise<string> => {
		const response = await fastify.inject({ method: "POST", payload: ROW, url: "/unique-items-rows" });

		expect(response.statusCode).toBe(HttpStatus.CREATED);

		return response.json().id;
	};

	it.each([
		["PUT", "UPDATE"],
		["PATCH", "PARTIAL_UPDATE"],
	])("answers 400 on a generated %s route for repeated items, and writes distinct ones", async (method: string) => {
		const id: string = await createRow();
		const duplicates = await fastify.inject({ method, payload: { ...ROW, labels: ["first", "first"] }, url: `/unique-items-rows/${id}` });
		const distinct = await fastify.inject({ method, payload: { ...ROW, labels: ["second", "third"] }, url: `/unique-items-rows/${id}` });

		expect(duplicates.statusCode).toBe(HttpStatus.BAD_REQUEST);
		expect(duplicates.json().message).toEqual(["labels must not contain duplicate items"]);
		expect(distinct.statusCode).toBe(HttpStatus.OK);
		expect(distinct.json()).toEqual(expect.objectContaining({ labels: ["second", "third"] }));
	});

	it("lets a list filter repeat a value, since its values array is not declared unique", async () => {
		const id: string = await createRow();
		const response = await fastify.inject({ method: "GET", url: "/unique-items-rows?limit=100&page=1&name[operator]=in&name[values]=first&name[values]=first" });

		expect(response.statusCode).toBe(HttpStatus.OK);
		expect(response.json().items.map((item: { id: string }) => item.id)).toContain(id);
	});

	describe("under ValidationPipe whitelist, which strips undeclared keys after this check", () => {
		it("does not let an undeclared key tell two items apart on a manual DTO", async () => {
			const response = await fastify.inject({ method: "POST", payload: { items: [{ id: 1 }, { id: 1, junk: 2 }] }, url: "/unique-items/objects" });

			expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
			expect(response.json().message).toEqual(["items must not contain duplicate items"]);
		});

		it("accepts items that differ in a declared property, and strips the undeclared key", async () => {
			const response = await fastify.inject({ method: "POST", payload: { items: [{ id: 1 }, { id: 2, junk: 2 }] }, url: "/unique-items/objects" });

			expect(response.statusCode).toBe(HttpStatus.OK);
			expect(response.json()).toEqual({ items: [{ id: 1 }, { id: 2 }] });
		});

		it("does not let an undeclared key tell two items apart on a generated route", async () => {
			const response = await fastify.inject({ method: "POST", payload: { ...ROW, children: [{ id: 1 }, { id: 1, junk: 2 }] }, url: "/unique-items-rows" });

			expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
			expect(response.json().message).toEqual(["children must not contain duplicate items"]);
		});

		it("answers 200 for free-form items that differ in a key", async () => {
			const response = await fastify.inject({ method: "POST", payload: { items: [{ id: 1 }, { id: 1, other: 2 }] }, url: "/unique-items/free-form" });

			expect(response.statusCode).toBe(HttpStatus.OK);
		});
	});

	describe("nesting cap", () => {
		const nest = (levels: number): unknown => {
			let nested: unknown = "leaf";

			for (let level: number = 1; level < levels; level++) {
				nested = { nested };
			}

			return nested;
		};

		it("accepts an item at the cap of 64 levels", async () => {
			const response = await fastify.inject({ method: "POST", payload: { items: [nest(64), { other: 1 }] }, url: "/unique-items/free-form" });

			expect(response.statusCode).toBe(HttpStatus.OK);
		});

		it("answers 400 with its own message past the cap", async () => {
			const response = await fastify.inject({ method: "POST", payload: { items: [nest(65), { other: 1 }] }, url: "/unique-items/free-form" });

			expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
			expect(response.json().message).toEqual(["items must not nest items more than 64 levels deep"]);
		});
	});
});
