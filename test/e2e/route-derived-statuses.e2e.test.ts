import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type { OpenAPIObject } from "@nestjs/swagger";
import type { Repository } from "typeorm";

import { Body, Controller, HttpStatus, Inject, Injectable, RequestMethod, UnprocessableEntityException, ValidationPipe } from "@nestjs/common";
import { ExpressAdapter } from "@nestjs/platform-express";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Test } from "@nestjs/testing";
import { InjectRepository, TypeOrmModule } from "@nestjs/typeorm";
import { Ajv } from "ajv";
import addFormats from "ajv-formats";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiAuthorizationPolicy, ApiAuthorizationPolicyBase, ApiController, ApiControllerSecurable, ApiPropertyDescribe, ApiRouteCustom, ApiService, ApiServiceBase, ApiSubscriberModule, EApiAuthorizationMode, EApiControllerRelationReferenceShape, EApiControllerRequestTarget, EApiPolicyEffect, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType, EErrorStringAction } from "../../src";

interface IWireCase {
	body?: Record<string, unknown>;
	isExpressKnownBug?: boolean;
	method: "GET" | "POST";
	name: string;
	path: string;
	status: number;
}

const STRING_PROPERTY = { format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING } as const;
const AUTHORIZATION = { defaultMode: EApiAuthorizationMode.HOOKS };
const NO_GENERATED_ROUTES = {
	[EApiRouteType.CREATE]: { generation: { isEnabled: false } },
	[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
	[EApiRouteType.GET]: { generation: { isEnabled: false } },
	[EApiRouteType.GET_LIST]: { generation: { isEnabled: false } },
	[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
	[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
};

@Entity("derived_parents")
class DerivedParentEntity {
	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe({ ...STRING_PROPERTY, description: "id", exampleValue: "parent-1" })
	public id!: string;
}

@Entity("derived_children")
class DerivedChildEntity {
	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe({ ...STRING_PROPERTY, description: "id", exampleValue: "child-1" })
	public id!: string;

	@Column({ nullable: true, type: "varchar" })
	@ApiPropertyDescribe({ ...STRING_PROPERTY, description: "parentId", exampleValue: "parent-1", isNullable: true })
	public parentId?: string;

	@ManyToOne(() => DerivedParentEntity, { nullable: true })
	@JoinColumn({ name: "parentId" })
	@ApiPropertyDescribe({ description: "parent", relationMetadata: { entity: DerivedParentEntity, isEager: false, relationType: "many-to-one" }, type: EApiPropertyDescribeType.RELATION } as unknown as { description: string; type: EApiPropertyDescribeType.RELATION })
	public parent?: DerivedParentEntity;
}

@Entity("derived_scoped")
class DerivedScopedEntity {
	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe({ ...STRING_PROPERTY, description: "id", exampleValue: "scoped-1" })
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({ ...STRING_PROPERTY, description: "name", exampleValue: "visible" })
	public name!: string;
}

@Injectable()
@ApiService({ entity: DerivedParentEntity })
class DerivedParentService extends ApiServiceBase<DerivedParentEntity> {
	@InjectRepository(DerivedParentEntity)
	public readonly repository!: Repository<DerivedParentEntity>;
}

@Injectable()
@ApiService({ entity: DerivedChildEntity })
class DerivedChildService extends ApiServiceBase<DerivedChildEntity> {
	@InjectRepository(DerivedChildEntity)
	public readonly repository!: Repository<DerivedChildEntity>;
}

@Injectable()
@ApiService({ entity: DerivedScopedEntity })
class DerivedScopedService extends ApiServiceBase<DerivedScopedEntity> {
	@InjectRepository(DerivedScopedEntity)
	public readonly repository!: Repository<DerivedScopedEntity>;
}

@Injectable()
@ApiAuthorizationPolicy({ entity: DerivedScopedEntity })
class DerivedScopedPolicy extends ApiAuthorizationPolicyBase<DerivedScopedEntity> {
	public onBeforeCreate() {
		return [{ effect: EApiPolicyEffect.ALLOW, scope: () => ({ where: { name: "visible" } }) }] as never;
	}
}

const customRoute = (name: string, method: RequestMethod = RequestMethod.POST): { resource: { action: string; entity: typeof DerivedChildEntity }; response: { status: HttpStatus; type: undefined }; route: { method: RequestMethod; path: string } } => ({
	resource: { action: `derived.${name}`, entity: DerivedChildEntity },
	response: { status: HttpStatus.OK, type: undefined },
	route: { method, path: `custom/${name}` },
});

@ApiController<DerivedParentEntity>({ entity: DerivedParentEntity, name: "DerivedParents", path: "derived-parents", routes: {} })
class DerivedParentController {
	@Inject(DerivedParentService)
	public readonly service!: DerivedParentService;
}

@ApiController<DerivedChildEntity>({ entity: DerivedChildEntity, name: "DerivedChildren", path: "derived-children", routes: NO_GENERATED_ROUTES })
class DerivedChildController {
	@Inject(DerivedParentService)
	public readonly parentService!: DerivedParentService;

	@Inject(DerivedChildService)
	public readonly service!: DerivedChildService;

	@ApiRouteCustom<DerivedChildEntity>(customRoute("plain"))
	public plain(): { isReady: boolean } {
		return { isReady: true };
	}

	@ApiRouteCustom<DerivedChildEntity>({ ...customRoute("relation"), relations: { request: { load: { include: { parent: true } }, reference: { shape: EApiControllerRelationReferenceShape.SCALAR } } } } as never)
	public relation(@Body() _body: unknown): { isReady: boolean } {
		return { isReady: true };
	}

	@ApiRouteCustom<DerivedChildEntity>({ ...customRoute("response-relation", RequestMethod.GET), relations: { response: { load: { include: { parent: true } } } } } as never)
	public responseRelation(): { id: string } {
		return { id: "child-missing" };
	}

	@ApiRouteCustom<DerivedChildEntity>({ ...customRoute("validated"), request: { [EApiControllerRequestTarget.BODY]: { validators: [{ errorType: EErrorStringAction.VALIDATION_ERROR, exception: UnprocessableEntityException, validationFunction: (): boolean => false }] } } } as never)
	public validated(@Body() _body: unknown): { isReady: boolean } {
		return { isReady: true };
	}
}

@ApiControllerSecurable()
@ApiController<DerivedScopedEntity>({ authorization: AUTHORIZATION, entity: DerivedScopedEntity, name: "DerivedScoped", path: "derived-scoped", routes: {} })
class DerivedScopedController {
	@Inject(DerivedScopedService)
	public readonly service!: DerivedScopedService;
}

@ApiController<DerivedScopedEntity>({ entity: DerivedScopedEntity, name: "DerivedOpen", path: "derived-open", routes: {} })
class DerivedOpenController {
	@Inject(DerivedScopedService)
	public readonly service!: DerivedScopedService;
}

const SHARED_ROUTE = { resource: { action: "derived.shared", entity: DerivedScopedEntity }, response: { status: HttpStatus.OK, type: undefined }, route: { method: RequestMethod.GET, path: "custom/shared" } };

@ApiController<DerivedScopedEntity>({ authorization: AUTHORIZATION, entity: DerivedScopedEntity, name: "DerivedBase", path: "derived-base", routes: NO_GENERATED_ROUTES })
class DerivedBaseController {
	@Inject(DerivedScopedService)
	public readonly service!: DerivedScopedService;

	@ApiRouteCustom<DerivedScopedEntity>(SHARED_ROUTE)
	public shared(): { isShared: boolean } {
		return { isShared: true };
	}
}

@ApiControllerSecurable()
@Controller("derived-securable-sibling")
class DerivedSecurableSiblingController extends DerivedBaseController {}

@ApiController<DerivedScopedEntity>({ entity: DerivedScopedEntity, name: "DerivedPlainSibling", path: "derived-plain-sibling", routes: NO_GENERATED_ROUTES })
class DerivedPlainSiblingController extends DerivedBaseController {}

const WIRE_CASES: Array<IWireCase> = [
	{ body: { id: "scoped-out", name: "hidden" }, method: "POST", name: "a securable CREATE outside its policy scope", path: "/derived-scoped", status: HttpStatus.NOT_FOUND },
	{ body: {}, isExpressKnownBug: true, method: "POST", name: "a custom route validator", path: "/derived-children/custom/validated", status: HttpStatus.UNPROCESSABLE_ENTITY },
	{ body: { parent: "parent-missing" }, isExpressKnownBug: true, method: "POST", name: "a custom route request relation with a missing row", path: "/derived-children/custom/relation", status: HttpStatus.NOT_FOUND },
	{ isExpressKnownBug: true, method: "GET", name: "a custom route response relation with a missing row", path: "/derived-children/custom/response-relation", status: HttpStatus.NOT_FOUND },
];

const ADAPTERS: Array<[string, () => ExpressAdapter | FastifyAdapter]> = [
	["fastify", () => new FastifyAdapter()],
	["express", () => new ExpressAdapter()],
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

describe.each(ADAPTERS)("statuses derived from the route config on %s (E2E)", (adapterName: string, createAdapter: () => ExpressAdapter | FastifyAdapter) => {
	let app: INestApplication;
	let ajv: Ajv;
	let baseUrl: string;
	let document: OpenAPIObject;

	const declaredStatuses = (path: string, method: string): Array<number> =>
		Object.keys((document.paths[path] as Record<string, { responses: Record<string, unknown> }>)[method]?.responses ?? {})
			.map(Number)
			.filter((status: number): boolean => status >= HttpStatus.BAD_REQUEST);

	const expectDeclaredAnswer = async (wireCase: IWireCase): Promise<void> => {
		const response: Response = await fetch(`${baseUrl}${wireCase.path}`, { ...(wireCase.body === undefined ? {} : { body: JSON.stringify(wireCase.body), headers: { "content-type": "application/json" } }), method: wireCase.method });
		const body: unknown = await response.json();

		expect(response.status, JSON.stringify(body)).toBe(wireCase.status);

		const reference: string | undefined = (document.paths[wireCase.path] as Record<string, { responses: Record<string, { content?: Record<string, { schema?: { $ref?: string } }> }> }>)[wireCase.method.toLowerCase()]?.responses[String(wireCase.status)]?.content?.["application/json"]?.schema?.$ref;

		expect(reference, `${wireCase.name} is declared`).toBeDefined();

		const validate = ajv.getSchema(`openapi${reference ?? ""}`);

		expect(validate?.(body), JSON.stringify(validate?.errors)).toBe(true);
	};

	beforeAll(async () => {
		const entities: Array<new () => object> = [DerivedChildEntity, DerivedParentEntity, DerivedScopedEntity];

		const moduleReference = await Test.createTestingModule({
			controllers: [DerivedChildController, DerivedOpenController, DerivedParentController, DerivedPlainSiblingController, DerivedScopedController, DerivedSecurableSiblingController],
			imports: [TypeOrmModule.forRoot({ database: ":memory:", dropSchema: true, entities, synchronize: true, type: "better-sqlite3" }), TypeOrmModule.forFeature(entities), ApiAuthorizationModule.forRoot(), ApiSubscriberModule],
			providers: [DerivedChildService, DerivedParentService, DerivedScopedPolicy, DerivedScopedService],
		}).compile();

		app = moduleReference.createNestApplication(createAdapter());
		app.useGlobalPipes(new ValidationPipe({ transform: true }));
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

	it.each(WIRE_CASES.filter((wireCase: IWireCase): boolean => adapterName !== "express" || !wireCase.isExpressKnownBug).map((wireCase: IWireCase): [string, IWireCase] => [wireCase.name, wireCase]))("declares the answer of %s", async (_name: string, wireCase: IWireCase) => {
		await expectDeclaredAnswer(wireCase);
	});

	// Express answers these 500 until bugfix/custom-route-express-query merges, then this block fails and the marker goes
	it.fails.each(WIRE_CASES.filter((wireCase: IWireCase): boolean => adapterName === "express" && wireCase.isExpressKnownBug === true).map((wireCase: IWireCase): [string, IWireCase] => [wireCase.name, wireCase]))("declares the answer of %s", async (_name: string, wireCase: IWireCase) => {
		await expectDeclaredAnswer(wireCase);
	});

	it("declares what each custom route config can raise and nothing more", () => {
		expect(declaredStatuses("/derived-children/custom/plain", "post")).toEqual([400, 413, 415, 500]);
		expect(declaredStatuses("/derived-children/custom/validated", "post")).toEqual([400, 413, 415, 422, 500]);
		expect(declaredStatuses("/derived-children/custom/relation", "post")).toEqual([400, 404, 413, 415, 500]);
		expect(declaredStatuses("/derived-children/custom/response-relation", "get")).toEqual([400, 404, 413, 415, 500]);
	});

	it("declares 404 on a CREATE only where a policy scope can hide the new row", () => {
		expect(declaredStatuses("/derived-scoped", "post")).toEqual([400, 403, 404, 409, 413, 415, 500]);
		expect(declaredStatuses("/derived-open", "post")).toEqual([400, 409, 413, 415, 500]);
	});

	it("declares 403 on a route of a decorated base only for the sibling that can answer it", () => {
		expect(declaredStatuses("/derived-securable-sibling/custom/shared", "get")).toEqual([400, 403, 413, 415, 500]);
		expect(declaredStatuses("/derived-plain-sibling/custom/shared", "get")).toEqual([400, 413, 415, 500]);
	});

	it("refuses the securable sibling with its declared 403", async () => {
		expect((await fetch(`${baseUrl}/derived-securable-sibling/custom/shared`)).status).toBe(HttpStatus.FORBIDDEN);
	});

	// Express answers this 500 until bugfix/custom-route-express-query merges, then this case fails and the marker goes
	(adapterName === "express" ? it.fails : it)("answers the plain sibling without a refusal", async () => {
		expect((await fetch(`${baseUrl}/derived-plain-sibling/custom/shared`)).status).toBe(HttpStatus.OK);
	});

	it("resolves every component reference", () => {
		const references: Array<string> = [...JSON.stringify(document).matchAll(/"#\/components\/schemas\/([^"]+)"/g)].map((match: RegExpExecArray): string => match[1] ?? "");

		expect(references.length).toBeGreaterThan(0);
		expect(references.filter((name: string): boolean => !document.components?.schemas?.[name])).toEqual([]);
	});

	it("creates a row inside the policy scope", async () => {
		const response: Response = await fetch(`${baseUrl}/derived-scoped`, { body: JSON.stringify({ id: "scoped-in", name: "visible" }), headers: { "content-type": "application/json" }, method: "POST" });

		expect(response.status).toBe(HttpStatus.CREATED);
	});
});
