import "reflect-metadata";

import type { ExceptionFilter, INestApplication, NestInterceptor } from "@nestjs/common";
import type { OpenAPIObject } from "@nestjs/swagger";
import type { Repository } from "typeorm";

import { Body, HttpStatus, Inject, Injectable, RequestMethod, ValidationPipe } from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";
import { ExpressAdapter } from "@nestjs/platform-express";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Test } from "@nestjs/testing";
import { InjectRepository, TypeOrmModule } from "@nestjs/typeorm";
import { Ajv } from "ajv";
import addFormats from "ajv-formats";
import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryColumn } from "typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiController, ApiPropertyDescribe, ApiRouteCustom, ApiService, ApiServiceBase, ApiSubscriberModule, CorrelationIDResponseBodyExceptionFilter, CorrelationIDResponseBodyInterceptor, EApiControllerRelationReferenceShape, EApiExceptionDetailsType, EApiPropertyDescribeType, EApiPropertyStringType } from "../../src/index";

import { expectEveryReferenceToResolve } from "./expect-every-reference-to-resolve";

interface IWireAnswer {
	body: { details?: Record<string, unknown>; statusCode?: number };
	status: number;
}

const STRING_PROPERTY = { format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING } as const;

@Entity("details_parents")
class DetailsParentEntity {
	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe({ ...STRING_PROPERTY, description: "id", exampleValue: "parent-1" })
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({ ...STRING_PROPERTY, description: "name", exampleValue: "Parent" })
	public name!: string;

	@OneToMany(() => DetailsChildEntity, (child: DetailsChildEntity) => child.parent)
	@ApiPropertyDescribe({ description: "children", relationMetadata: { entity: () => DetailsChildEntity, isEager: false, relationType: "one-to-many" }, type: EApiPropertyDescribeType.RELATION } as never)
	public children?: Array<DetailsChildEntity>;
}

@Entity("details_children")
class DetailsChildEntity {
	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe({ ...STRING_PROPERTY, description: "id", exampleValue: "child-1" })
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({ ...STRING_PROPERTY, description: "name", exampleValue: "Child" })
	public name!: string;

	@Column({ nullable: true, type: "varchar" })
	@ApiPropertyDescribe({ ...STRING_PROPERTY, description: "parentId", exampleValue: "parent-1", isNullable: true })
	public parentId?: string;

	@ManyToOne(() => DetailsParentEntity, { nullable: true })
	@JoinColumn({ name: "parentId" })
	@ApiPropertyDescribe({ description: "parent", relationMetadata: { entity: DetailsParentEntity, isEager: false, relationType: "many-to-one" }, type: EApiPropertyDescribeType.RELATION } as never)
	public parent?: DetailsParentEntity;
}

@Entity("details_items")
class DetailsItemEntity {
	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe({ ...STRING_PROPERTY, description: "id", exampleValue: "item-1" })
	public id!: string;

	@Column({ type: "varchar", unique: true })
	@ApiPropertyDescribe({ ...STRING_PROPERTY, description: "name", exampleValue: "Item" })
	public name!: string;
}

@Injectable()
@ApiService({ entity: DetailsItemEntity })
class DetailsItemService extends ApiServiceBase<DetailsItemEntity> {
	@InjectRepository(DetailsItemEntity)
	public readonly repository!: Repository<DetailsItemEntity>;
}

@Injectable()
@ApiService({ entity: DetailsParentEntity })
class DetailsParentService extends ApiServiceBase<DetailsParentEntity> {
	@InjectRepository(DetailsParentEntity)
	public readonly repository!: Repository<DetailsParentEntity>;
}

@Injectable()
@ApiService({ entity: DetailsChildEntity })
class DetailsChildService extends ApiServiceBase<DetailsChildEntity> {
	@InjectRepository(DetailsChildEntity)
	public readonly repository!: Repository<DetailsChildEntity>;
}

@ApiController<DetailsItemEntity>({ entity: DetailsItemEntity, name: "DetailsItems", path: "details-items", routes: {} })
class DetailsItemController {
	@Inject(DetailsItemService)
	public readonly service!: DetailsItemService;
}

@ApiController<DetailsParentEntity>({ entity: DetailsParentEntity, name: "DetailsParents", path: "details-parents", routes: {} })
class DetailsParentController {
	@Inject(DetailsParentService)
	public readonly service!: DetailsParentService;
}

@ApiController<DetailsChildEntity>({ entity: DetailsChildEntity, name: "DetailsChildren", path: "details-children", routes: {} })
class DetailsChildController {
	@Inject(DetailsChildService)
	public readonly service!: DetailsChildService;

	@Inject(DetailsParentService)
	public readonly parentService!: DetailsParentService;

	@ApiRouteCustom<DetailsChildEntity>({
		relations: { request: { load: { include: { parent: true } }, reference: { shape: EApiControllerRelationReferenceShape.SCALAR } } },
		resource: { action: "details.relation", entity: DetailsChildEntity },
		response: { status: HttpStatus.OK, type: undefined },
		route: { method: RequestMethod.POST, path: "custom/relation" },
	} as never)
	public relation(@Body() body: Record<string, unknown>): { isDone: boolean } {
		return { isDone: Object.keys(body).length > 0 };
	}
}

/**
 * Drops OpenAPI `nullable: false`, its default, which Ajv rejects next to a schema combinator.
 * @param {unknown} value - OpenAPI schema fragment.
 * @returns {unknown} The fragment without `nullable: false`.
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

interface ISetup {
	createFilters: (application: INestApplication) => Array<ExceptionFilter>;
	createInterceptors: () => Array<NestInterceptor>;
	hasCorrelationFields: boolean;
	name: string;
}

// A field the schema requires must be on the wire in each of these setups
const SETUPS: Array<[string, ISetup]> = [
	["without the interceptor", { createFilters: (): Array<ExceptionFilter> => [], createInterceptors: (): Array<NestInterceptor> => [], hasCorrelationFields: false, name: "bare" }],
	["with the interceptor", { createFilters: (): Array<ExceptionFilter> => [], createInterceptors: (): Array<NestInterceptor> => [new CorrelationIDResponseBodyInterceptor()], hasCorrelationFields: true, name: "interceptor" }],
	["with the interceptor and the filter", { createFilters: (application: INestApplication): Array<ExceptionFilter> => [new CorrelationIDResponseBodyExceptionFilter(application.get(HttpAdapterHost))], createInterceptors: (): Array<NestInterceptor> => [new CorrelationIDResponseBodyInterceptor()], hasCorrelationFields: true, name: "both" }],
];

const ADAPTERS: Array<[string, () => ExpressAdapter | FastifyAdapter]> = [
	["fastify", (): FastifyAdapter => new FastifyAdapter()],
	["express", (): ExpressAdapter => new ExpressAdapter()],
];

interface IDetailsCase {
	body?: unknown;
	details: Record<string, unknown>;
	method: "delete" | "patch" | "post" | "put";
	name: string;
	path: string;
	status: number;
	url: string;
}

const TO_MANY_DETAILS = { propertyName: "children", reason: "to-many reference is not allowed on update", type: EApiExceptionDetailsType.TO_MANY_UPDATE_KEY };

const DETAILS_CASES: Array<IDetailsCase> = [
	{ body: { children: ["child-1"] }, details: TO_MANY_DETAILS, method: "patch", name: "a to-many key on PATCH", path: "/details-parents/{id}", status: HttpStatus.BAD_REQUEST, url: "/details-parents/parent-1" },
	{ body: { children: ["child-1"], name: "Parent" }, details: TO_MANY_DETAILS, method: "put", name: "a to-many key on PUT", path: "/details-parents/{id}", status: HttpStatus.BAD_REQUEST, url: "/details-parents/parent-1" },
	{ body: { parent: { id: "parent-1" } }, details: { expectedShape: EApiControllerRelationReferenceShape.SCALAR, propertyName: "parent", referenceKey: "id", type: EApiExceptionDetailsType.REFERENCE_NOT_VALID }, method: "post", name: "a relation reference of the wrong shape", path: "/details-children/custom/relation", status: HttpStatus.BAD_REQUEST, url: "/details-children/custom/relation" },
	{ details: { type: EApiExceptionDetailsType.FOREIGN_KEY_VIOLATION }, method: "delete", name: "a foreign key in use", path: "/details-parents/{id}", status: HttpStatus.BAD_REQUEST, url: "/details-parents/parent-1" },
	{ body: { id: "item-2", name: "One" }, details: { type: EApiExceptionDetailsType.UNIQUE_VIOLATION }, method: "post", name: "a duplicate key", path: "/details-items", status: HttpStatus.CONFLICT, url: "/details-items" },
];

describe.each(ADAPTERS)("exception schemas on %s (E2E)", (_adapterName: string, createAdapter: () => ExpressAdapter | FastifyAdapter) => {
	describe.each(SETUPS)("%s", (_setupName: string, setup: ISetup) => {
		let app: INestApplication;
		let ajv: Ajv;
		let baseUrl: string;
		let document: OpenAPIObject;

		const validatorOf = (path: string, method: string, status: number) => {
			const reference: string | undefined = (document.paths[path] as Record<string, { responses: Record<string, { content?: Record<string, { schema?: { $ref?: string } }> }> }>)[method]?.responses[String(status)]?.content?.["application/json"]?.schema?.$ref;

			expect(reference, `${method} ${path} ${status}`).toBeDefined();

			return ajv.getSchema(`openapi${reference ?? ""}`);
		};

		const expectDetails = async (detailsCase: IDetailsCase): Promise<void> => {
			const response: Response = await fetch(`${baseUrl}${detailsCase.url}`, { ...(detailsCase.body === undefined ? {} : { body: JSON.stringify(detailsCase.body), headers: { "content-type": "application/json" } }), method: detailsCase.method.toUpperCase() });
			const answer: IWireAnswer = { body: (await response.json()) as IWireAnswer["body"], status: response.status };

			expect(answer.status, JSON.stringify(answer.body)).toBe(detailsCase.status);
			expect(answer.body.details).toMatchObject(detailsCase.details);

			const validate = validatorOf(detailsCase.path, detailsCase.method, detailsCase.status);

			expect(validate?.(answer.body), JSON.stringify(validate?.errors)).toBe(true);
			expect("correlationID" in answer.body).toBe(setup.hasCorrelationFields);
			expect("timestamp" in answer.body).toBe(setup.hasCorrelationFields);
		};

		beforeAll(async () => {
			const moduleReference = await Test.createTestingModule({
				controllers: [DetailsChildController, DetailsItemController, DetailsParentController],
				imports: [TypeOrmModule.forRoot({ database: ":memory:", dropSchema: true, entities: [DetailsChildEntity, DetailsItemEntity, DetailsParentEntity], synchronize: true, type: "better-sqlite3" }), TypeOrmModule.forFeature([DetailsChildEntity, DetailsItemEntity, DetailsParentEntity]), ApiAuthorizationModule.forRoot({}), ApiSubscriberModule],
				providers: [DetailsChildService, DetailsItemService, DetailsParentService],
			}).compile();

			app = moduleReference.createNestApplication(createAdapter());
			app.useGlobalPipes(new ValidationPipe({ transform: true }));
			app.useGlobalInterceptors(...setup.createInterceptors());
			app.useGlobalFilters(...setup.createFilters(app));
			await app.listen(0, "127.0.0.1");
			baseUrl = (await app.getUrl()).replace("[::1]", "127.0.0.1");
			document = SwaggerModule.createDocument(app, new DocumentBuilder().build());
			await app.get(DetailsParentService).repository.save({ id: "parent-1", name: "One" });
			await app.get(DetailsChildService).repository.save({ id: "child-1", name: "One", parentId: "parent-1" });
			await app.get(DetailsItemService).repository.save({ id: "item-1", name: "One" });

			ajv = new Ajv({ allErrors: true, discriminator: false, strict: false });
			addFormats(ajv);
			ajv.addFormat("int64", true);
			ajv.addFormat("string", true);
			ajv.addSchema({ components: withoutNonNullableFlags(document.components) }, "openapi");
		}, 60_000);

		afterAll(async () => {
			await app?.close();
		});

		it.each(DETAILS_CASES.map((detailsCase: IDetailsCase): [string, IDetailsCase] => [detailsCase.name, detailsCase]))("%s matches exactly one details variant of the declared schema", async (_name: string, detailsCase: IDetailsCase) => {
			await expectDetails(detailsCase);
		});

		it.each<[string, string, string, number]>([
			["a missing row", "get", "/details-items/{id}", HttpStatus.NOT_FOUND],
			["a duplicate key", "post", "/details-items", HttpStatus.CONFLICT],
		])("requires no correlation field for %s", (_name: string, method: string, path: string, status: number) => {
			const schemas = document.components?.schemas as Record<string, { required?: Array<string> }>;
			const reference: string = (document.paths[path] as Record<string, { responses: Record<string, { content: Record<string, { schema: { $ref: string } }> }> }>)[method]?.responses[String(status)]?.content["application/json"]?.schema.$ref ?? "";

			expect(schemas[reference.split("/").at(-1) ?? ""]?.required?.toSorted()).toEqual(["message", "statusCode"]);
		});

		it("resolves every component reference", () => {
			expectEveryReferenceToResolve(document);
		});

		it("answers a missing row with the declared 404 schema", async () => {
			const response: Response = await fetch(`${baseUrl}/details-items/item-missing`);
			const body: IWireAnswer["body"] = (await response.json()) as IWireAnswer["body"];
			const validate = validatorOf("/details-items/{id}", "get", HttpStatus.NOT_FOUND);

			expect(response.status).toBe(HttpStatus.NOT_FOUND);
			expect(validate?.(body), JSON.stringify(validate?.errors)).toBe(true);
			expect("correlationID" in body).toBe(setup.hasCorrelationFields);
			expect("timestamp" in body).toBe(setup.hasCorrelationFields);
		});

		it.each<[string, EApiExceptionDetailsType]>([
			["ExceptionDetailsForeignKeyViolation", EApiExceptionDetailsType.FOREIGN_KEY_VIOLATION],
			["ExceptionDetailsReferenceNotValid", EApiExceptionDetailsType.REFERENCE_NOT_VALID],
			["ExceptionDetailsToManyUpdateKey", EApiExceptionDetailsType.TO_MANY_UPDATE_KEY],
			["ExceptionDetailsUniqueViolation", EApiExceptionDetailsType.UNIQUE_VIOLATION],
		])("gives %s its own single type value", (name: string, type: EApiExceptionDetailsType) => {
			const schemas = document.components?.schemas as Record<string, { properties?: Record<string, { enum?: Array<string> }>; required?: Array<string> }>;

			expect(schemas[`${name}DTO`]?.properties?.type?.enum).toEqual([type]);
			expect(schemas[`${name}DTO`]?.required).toContain("type");
		});
	});
});
