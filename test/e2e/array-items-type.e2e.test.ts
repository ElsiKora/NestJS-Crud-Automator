import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type { Repository } from "typeorm";

import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Injectable, Post, Query, ValidationPipe } from "@nestjs/common";
import { APP_PIPE } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { ApiBody, ApiOkResponse, DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Test } from "@nestjs/testing";
import { InjectRepository, TypeOrmModule } from "@nestjs/typeorm";
import Ajv from "ajv";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiController, ApiPropertyDate, ApiPropertyDescribe, ApiPropertyString, ApiPropertyUUID, ApiService, ApiServiceBase, ApiSubscriberModule, EApiPropertyDateIdentifier, EApiPropertyDateType, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "../../src/index";

type TSchema = Record<string, unknown> & { items?: Record<string, unknown> };
type TDocument = { components: { schemas: Record<string, { properties: Record<string, TSchema> }> }; paths: Record<string, { get: { parameters: Array<{ name: string; schema: TSchema }> } }> };

const ARRAY_BOUNDS = { isArray: true, isUniqueItems: false, maxItems: 3, minItems: 1 } as const;
const STRING_OPTIONS = { exampleValue: ["first"], format: EApiPropertyStringType.STRING, maxLength: 10, minLength: 1, pattern: "/^.+$/" };
const DATE_OPTIONS = { format: EApiPropertyDateType.DATE_TIME, identifier: EApiPropertyDateIdentifier.DATE };
const PROPERTIES: Array<string> = ["dates", "labels", "references"];

@Entity("e2e_array_items_rows")
class E2eArrayItemsEntity {
	@ApiPropertyDescribe({ description: "arrayItemsRowId", type: EApiPropertyDescribeType.UUID })
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@ApiPropertyDescribe({ ...ARRAY_BOUNDS, ...DATE_OPTIONS, type: EApiPropertyDescribeType.DATE })
	@Column({ type: "simple-json" })
	public dates!: Array<Date>;

	@ApiPropertyDescribe({ ...ARRAY_BOUNDS, ...STRING_OPTIONS, description: "arrayItemsRowLabels", type: EApiPropertyDescribeType.STRING })
	@Column({ type: "simple-json" })
	public labels!: Array<string>;

	@ApiPropertyDescribe({ ...ARRAY_BOUNDS, description: "arrayItemsRowReferences", type: EApiPropertyDescribeType.UUID })
	@Column({ type: "simple-json" })
	public references!: Array<string>;

	@ApiPropertyDescribe({ ...DATE_OPTIONS, type: EApiPropertyDescribeType.DATE })
	@Column({ type: "datetime" })
	public at!: Date;

	@ApiPropertyDescribe({ ...STRING_OPTIONS, description: "arrayItemsRowName", exampleValue: "first", type: EApiPropertyDescribeType.STRING })
	@Column({ type: "varchar" })
	public name!: string;

	@ApiPropertyDescribe({ description: "arrayItemsRowOwner", type: EApiPropertyDescribeType.UUID })
	@Column({ type: "varchar" })
	public owner!: string;
}

@Injectable()
@ApiService({ entity: E2eArrayItemsEntity })
class E2eArrayItemsService extends ApiServiceBase<E2eArrayItemsEntity> {
	@InjectRepository(E2eArrayItemsEntity)
	public readonly repository!: Repository<E2eArrayItemsEntity>;
}

@ApiController<E2eArrayItemsEntity>({ entity: E2eArrayItemsEntity, name: "E2eArrayItemsRows", path: "array-items-rows", routes: { [EApiRouteType.DELETE]: { generation: { isEnabled: false } } } })
class E2eArrayItemsRowController {
	public constructor(@Inject(E2eArrayItemsService) public readonly service: E2eArrayItemsService) {}
}

class E2eArrayItemsManualDto {
	@ApiPropertyDate({ ...ARRAY_BOUNDS, ...DATE_OPTIONS, description: "dates", entity: E2eArrayItemsEntity, isRequired: true })
	public dates!: Array<Date>;

	@ApiPropertyString({ ...ARRAY_BOUNDS, ...STRING_OPTIONS, description: "labels", entity: E2eArrayItemsEntity, isRequired: true })
	public labels!: Array<string>;

	@ApiPropertyUUID({ ...ARRAY_BOUNDS, description: "references", entity: E2eArrayItemsEntity, isRequired: true })
	public references!: Array<string>;
}

class E2eArrayItemsManualResponseDto {
	@ApiPropertyDate({ ...ARRAY_BOUNDS, ...DATE_OPTIONS, description: "dates", entity: E2eArrayItemsEntity, isResponse: true })
	public dates!: Array<Date>;

	@ApiPropertyString({ ...ARRAY_BOUNDS, ...STRING_OPTIONS, description: "labels", entity: E2eArrayItemsEntity, isResponse: true })
	public labels!: Array<string>;

	@ApiPropertyUUID({ ...ARRAY_BOUNDS, description: "references", entity: E2eArrayItemsEntity, isResponse: true })
	public references!: Array<string>;
}

@Controller("array-items")
class E2eArrayItemsManualController {
	@ApiBody({ type: E2eArrayItemsManualDto })
	@ApiOkResponse({ type: E2eArrayItemsManualResponseDto })
	@HttpCode(HttpStatus.OK)
	@Post()
	public body(@Body() body: E2eArrayItemsManualDto): E2eArrayItemsManualDto {
		return body;
	}

	@Get()
	public query(@Query() query: E2eArrayItemsManualDto): E2eArrayItemsManualDto {
		return query;
	}
}

describe("array items type in the OpenAPI document (E2E)", () => {
	let app: INestApplication | undefined;
	let document: TDocument;
	let schemas: TDocument["components"]["schemas"];

	const getParameterSchema = (path: string, name: string): TSchema | undefined => document.paths[path]?.get.parameters.find((parameter: { name: string }): boolean => parameter.name === name)?.schema;

	beforeAll(async () => {
		const moduleReference = await Test.createTestingModule({
			controllers: [E2eArrayItemsManualController, E2eArrayItemsRowController],
			imports: [TypeOrmModule.forRoot({ database: ":memory:", dropSchema: true, entities: [E2eArrayItemsEntity], logging: false, synchronize: true, type: "better-sqlite3" }), TypeOrmModule.forFeature([E2eArrayItemsEntity]), ApiAuthorizationModule.forRoot(), ApiSubscriberModule],
			providers: [{ provide: APP_PIPE, useValue: new ValidationPipe({ transform: true }) }, E2eArrayItemsService],
		}).compile();

		app = moduleReference.createNestApplication(new FastifyAdapter());
		await app.init();
		document = JSON.parse(JSON.stringify(SwaggerModule.createDocument(app, new DocumentBuilder().build())));
		schemas = document.components.schemas;
	});

	afterAll(async () => {
		await app?.close();
	});

	describe.each(PROPERTIES)("%s", (property: string) => {
		it.each(["E2eArrayItemsManualDto", "E2eArrayItemsManualResponseDto"])("types the items in the manual schema %s", (schemaName: string) => {
			expect(schemas[schemaName]?.properties[property]?.items?.type).toBe("string");
		});

		it("types the items of a query parameter", () => {
			expect(getParameterSchema("/array-items", property)?.items?.type).toBe("string");
		});

		it("types the items of every generated request and response schema", () => {
			const generated: Array<string> = Object.keys(schemas).filter((name: string): boolean => /(Body|Response)DTO$/.test(name) && schemas[name]?.properties[property] !== undefined);

			expect(generated.length).toBeGreaterThanOrEqual(2);
			expect(generated.filter((name: string): boolean => schemas[name]?.properties[property]?.items?.type !== "string")).toEqual([]);
		});

		it("refuses a number under a JSON Schema validator", () => {
			const validate = new Ajv({ strict: false, validateFormats: false }).compile(schemas.E2eArrayItemsManualDto?.properties[property] ?? {});

			expect(validate([1])).toBe(false);
		});
	});

	it.each(["at", "name", "owner"])("types the items of the %s[values] list filter", (property: string) => {
		expect(getParameterSchema("/array-items-rows", `${property}[values]`)?.items?.type).toBe("string");
	});
});
