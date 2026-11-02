import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type { OpenAPIObject } from "@nestjs/swagger";
import type { Repository } from "typeorm";

import { Body, ConflictException, Controller, HttpException, HttpStatus, Inject, Injectable, NotFoundException, RequestMethod, UnauthorizedException, UnprocessableEntityException, UseGuards, ValidationPipe } from "@nestjs/common";
import { ExpressAdapter } from "@nestjs/platform-express";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { REQUEST } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Test } from "@nestjs/testing";
import { InjectRepository, TypeOrmModule } from "@nestjs/typeorm";
import { Ajv } from "ajv";
import addFormats from "ajv-formats";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
	ApiAuthorizationModule,
	ApiAuthorizationPolicy,
	ApiAuthorizationPolicyBase,
	ApiController,
	ApiControllerObservable,
	ApiControllerSecurable,
	ApiMethod,
	ApiPropertyDescribe,
	ApiRouteCustom,
	ApiRouteSubscriber,
	ApiRouteSubscriberBase,
	ApiService,
	ApiServiceBase,
	ApiSubscriberModule,
	EApiAuthorizationMode,
	EApiControllerRelationReferenceShape,
	EApiControllerRequestTarget,
	EApiPolicyEffect,
	EApiPropertyDescribeType,
	EApiPropertyStringType,
	EApiRouteType,
	EErrorStringAction,
} from "../../src";
import { expectEveryReferenceToResolve } from "./expect-every-reference-to-resolve";

interface IWireCase {
	body?: Record<string, unknown>;
	documentPath?: string;
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

@Entity("derived_subscribed")
class DerivedSubscribedEntity {
	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe({ ...STRING_PROPERTY, description: "id", exampleValue: "subscribed-1" })
	public id!: string;
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
@ApiService({ entity: DerivedSubscribedEntity })
class DerivedSubscribedService extends ApiServiceBase<DerivedSubscribedEntity> {
	@InjectRepository(DerivedSubscribedEntity)
	public readonly repository!: Repository<DerivedSubscribedEntity>;
}

@Injectable()
@ApiRouteSubscriber({ entity: DerivedSubscribedEntity })
class DerivedSubscribedRouteSubscriber extends ApiRouteSubscriberBase<DerivedSubscribedEntity> {
	public onBeforeCreate(): never {
		throw new ConflictException();
	}

	public onBeforeGet(): never {
		throw new HttpException("gone", HttpStatus.NOT_FOUND);
	}
}

@Injectable()
@ApiAuthorizationPolicy({ entity: DerivedScopedEntity })
class DerivedScopedPolicy extends ApiAuthorizationPolicyBase<DerivedScopedEntity> {
	public onBeforeCreate() {
		return [{ effect: EApiPolicyEffect.ALLOW, scope: () => ({ where: { name: "visible" } }) }] as never;
	}
}

class DerivedRejectingGuard {
	public canActivate(): boolean {
		throw new UnauthorizedException();
	}
}

// A status HttpStatus does not list, so the schema cannot take its name or enum from it
class DerivedClientClosedException extends HttpException {
	public constructor(message?: object | string) {
		super(message ?? "Client closed", 499);
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

	@ApiRouteCustom<DerivedChildEntity>({ ...customRoute("validated-query", RequestMethod.GET), request: { [EApiControllerRequestTarget.QUERY]: { validators: [{ errorType: EErrorStringAction.VALIDATION_ERROR, exception: UnprocessableEntityException, validationFunction: (): boolean => false }] } } } as never)
	public validatedQuery(): { isReady: boolean } {
		return { isReady: true };
	}

	@ApiRouteCustom<DerivedChildEntity>({ ...customRoute("client-closed"), request: { [EApiControllerRequestTarget.BODY]: { validators: [{ errorType: EErrorStringAction.VALIDATION_ERROR, exception: DerivedClientClosedException, validationFunction: (): boolean => false }] } } } as never)
	public clientClosed(@Body() _body: unknown): { isReady: boolean } {
		return { isReady: true };
	}

	@ApiRouteCustom<DerivedChildEntity>({ ...customRoute("response-relation-disabled", RequestMethod.GET), relations: { response: { load: { include: { parent: false } } } } } as never)
	public responseRelationDisabled(): { id: string } {
		return { id: "child-missing" };
	}

	@UseGuards(DerivedRejectingGuard)
	@ApiRouteCustom<DerivedChildEntity>(customRoute("handler-guard"))
	public handlerGuard(): { isReady: boolean } {
		return { isReady: true };
	}
}

@ApiControllerObservable()
@ApiController<DerivedSubscribedEntity>({ entity: DerivedSubscribedEntity, name: "DerivedSubscribed", path: "derived-subscribed", routes: {} })
class DerivedSubscribedController {
	@Inject(DerivedSubscribedService)
	public readonly service!: DerivedSubscribedService;
}

// ApiMethod alone runs no route runtime, so no interceptor sees these bodies on either adapter
@ApiController<DerivedSubscribedEntity>({ entity: DerivedSubscribedEntity, name: "DerivedBare", path: "derived-bare", routes: NO_GENERATED_ROUTES })
class DerivedBareController {
	@Inject(DerivedSubscribedService)
	public readonly service!: DerivedSubscribedService;

	@ApiMethod<DerivedSubscribedEntity>({ metadata: { resource: { action: "derived.conflict", entity: DerivedSubscribedEntity }, response: { errors: { hasConflict: true }, status: HttpStatus.OK, type: undefined }, route: { method: RequestMethod.GET, path: "conflict" } } })
	public conflict(): never {
		throw new ConflictException();
	}

	@ApiMethod<DerivedSubscribedEntity>({ metadata: { resource: { action: "derived.missing", entity: DerivedSubscribedEntity }, response: { errors: { hasNotFound: true }, status: HttpStatus.OK, type: undefined }, route: { method: RequestMethod.GET, path: "missing" } } })
	public missing(): never {
		throw new NotFoundException();
	}
}

const ONLY_GET_LIST = { ...NO_GENERATED_ROUTES, [EApiRouteType.GET_LIST]: {} };

@ApiController<DerivedSubscribedEntity>({ entity: DerivedSubscribedEntity, name: "DerivedRouteGuard", path: "derived-route-guard", routes: { ...NO_GENERATED_ROUTES, [EApiRouteType.GET_LIST]: { execution: { guards: [DerivedRejectingGuard] } } } })
class DerivedRouteGuardController {
	@Inject(DerivedSubscribedService)
	public readonly service!: DerivedSubscribedService;
}

@UseGuards(DerivedRejectingGuard)
@ApiController<DerivedSubscribedEntity>({ entity: DerivedSubscribedEntity, name: "DerivedGuardAbove", path: "derived-guard-above", routes: ONLY_GET_LIST })
class DerivedGuardAboveController {
	@Inject(DerivedSubscribedService)
	public readonly service!: DerivedSubscribedService;
}

@ApiController<DerivedSubscribedEntity>({ entity: DerivedSubscribedEntity, name: "DerivedGuardBelow", path: "derived-guard-below", routes: ONLY_GET_LIST })
@UseGuards(DerivedRejectingGuard)
class DerivedGuardBelowController {
	@Inject(DerivedSubscribedService)
	public readonly service!: DerivedSubscribedService;
}

@ApiController<DerivedSubscribedEntity>({ entity: DerivedSubscribedEntity, name: "DerivedRequestScopedBase", path: "derived-request-scoped", routes: ONLY_GET_LIST })
class DerivedRequestScopedBaseController {
	@Inject(DerivedSubscribedService)
	public readonly service!: DerivedSubscribedService;
}

// Injecting the request makes the subclass REQUEST-scoped, so Nest constructs it only on a request, after Swagger read its routes
@UseGuards(DerivedRejectingGuard)
class DerivedRequestScopedGuardedController extends DerivedRequestScopedBaseController {
	@Inject(REQUEST)
	public readonly request!: unknown;
}

@ApiController<DerivedSubscribedEntity>({ entity: DerivedSubscribedEntity, name: "DerivedUnguarded", path: "derived-unguarded", routes: ONLY_GET_LIST })
class DerivedUnguardedController {
	@Inject(DerivedSubscribedService)
	public readonly service!: DerivedSubscribedService;
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

@UseGuards(DerivedRejectingGuard)
@ApiController<DerivedScopedEntity>({ entity: DerivedScopedEntity, name: "DerivedGuardedSibling", path: "derived-guarded-sibling", routes: NO_GENERATED_ROUTES })
class DerivedGuardedSiblingController extends DerivedBaseController {}

const WIRE_CASES: Array<IWireCase> = [
	{ body: { id: "scoped-out", name: "hidden" }, method: "POST", name: "a securable CREATE outside its policy scope", path: "/derived-scoped", status: HttpStatus.FORBIDDEN },
	{ body: {}, method: "POST", name: "a custom route validator", path: "/derived-children/custom/validated", status: HttpStatus.UNPROCESSABLE_ENTITY },
	{ body: { parent: "parent-missing" }, method: "POST", name: "a custom route request relation with a missing row", path: "/derived-children/custom/relation", status: HttpStatus.NOT_FOUND },
	{ method: "GET", name: "a custom route response relation with a missing row", path: "/derived-children/custom/response-relation", status: HttpStatus.NOT_FOUND },
	{ method: "GET", name: "a custom route response relation that disables every relation", path: "/derived-children/custom/response-relation-disabled", status: HttpStatus.NOT_FOUND },
	{ method: "GET", name: "a custom route query validator", path: "/derived-children/custom/validated-query", status: HttpStatus.UNPROCESSABLE_ENTITY },
	{ body: {}, method: "POST", name: "a validator whose status HttpStatus does not list", path: "/derived-children/custom/client-closed", status: 499 },
	{ method: "GET", name: "a NotFoundException without arguments and no interceptor", path: "/derived-bare/missing", status: HttpStatus.NOT_FOUND },
	{ method: "GET", name: "a ConflictException without arguments and no interceptor", path: "/derived-bare/conflict", status: HttpStatus.CONFLICT },
	{ documentPath: "/derived-subscribed/{id}", method: "GET", name: "an HttpException from a subscriber on a generated route", path: "/derived-subscribed/subscribed-1", status: HttpStatus.NOT_FOUND },
	{ body: { id: "subscribed-1" }, method: "POST", name: "a ConflictException from a subscriber on a generated route", path: "/derived-subscribed", status: HttpStatus.CONFLICT },
	{ method: "GET", name: "a route guard on a generated route", path: "/derived-route-guard", status: HttpStatus.UNAUTHORIZED },
	{ method: "GET", name: "a class guard above the controller decorator", path: "/derived-guard-above", status: HttpStatus.UNAUTHORIZED },
	{ method: "GET", name: "a class guard below the controller decorator", path: "/derived-guard-below", status: HttpStatus.UNAUTHORIZED },
	{ method: "GET", name: "a class guard on a subclass with an inherited route", path: "/derived-guarded-sibling/custom/shared", status: HttpStatus.UNAUTHORIZED },
	{ method: "GET", name: "a class guard on a REQUEST-scoped subclass without its own controller decorator", path: "/derived-request-scoped", status: HttpStatus.UNAUTHORIZED },
	{ body: {}, method: "POST", name: "a handler guard above the route decorator", path: "/derived-children/custom/handler-guard", status: HttpStatus.UNAUTHORIZED },
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

describe.each(ADAPTERS)("statuses derived from the route config on %s (E2E)", (_adapterName: string, createAdapter: () => ExpressAdapter | FastifyAdapter) => {
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

		const reference: string | undefined = (document.paths[wireCase.documentPath ?? wireCase.path] as Record<string, { responses: Record<string, { content?: Record<string, { schema?: { $ref?: string } }> }> }>)[wireCase.method.toLowerCase()]?.responses[String(wireCase.status)]?.content?.["application/json"]?.schema?.$ref;

		expect(reference, `${wireCase.name} is declared`).toBeDefined();

		const validate = ajv.getSchema(`openapi${reference ?? ""}`);

		expect(validate?.(body), JSON.stringify(validate?.errors)).toBe(true);
	};

	beforeAll(async () => {
		const entities: Array<new () => object> = [DerivedChildEntity, DerivedParentEntity, DerivedScopedEntity, DerivedSubscribedEntity];

		const moduleReference = await Test.createTestingModule({
			controllers: [DerivedBareController, DerivedChildController, DerivedGuardAboveController, DerivedGuardBelowController, DerivedGuardedSiblingController, DerivedOpenController, DerivedParentController, DerivedPlainSiblingController, DerivedRequestScopedGuardedController, DerivedRouteGuardController, DerivedScopedController, DerivedSecurableSiblingController, DerivedSubscribedController, DerivedUnguardedController],
			imports: [TypeOrmModule.forRoot({ database: ":memory:", dropSchema: true, entities, synchronize: true, type: "better-sqlite3" }), TypeOrmModule.forFeature(entities), ApiAuthorizationModule.forRoot(), ApiSubscriberModule],
			providers: [DerivedChildService, DerivedParentService, DerivedScopedPolicy, DerivedScopedService, DerivedSubscribedRouteSubscriber, DerivedSubscribedService],
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

	it.each(WIRE_CASES.map((wireCase: IWireCase): [string, IWireCase] => [wireCase.name, wireCase]))("declares the answer of %s", async (_name: string, wireCase: IWireCase) => {
		await expectDeclaredAnswer(wireCase);
	});

	it("declares what each custom route config can raise and nothing more", () => {
		expect(declaredStatuses("/derived-children/custom/plain", "post")).toEqual([400, 413, 415, 500]);
		expect(declaredStatuses("/derived-children/custom/validated", "post")).toEqual([400, 413, 415, 422, 500]);
		expect(declaredStatuses("/derived-children/custom/relation", "post")).toEqual([400, 404, 413, 415, 500]);
		expect(declaredStatuses("/derived-children/custom/response-relation", "get")).toEqual([400, 404, 413, 415, 500]);
		expect(declaredStatuses("/derived-children/custom/response-relation-disabled", "get")).toEqual([400, 404, 413, 415, 500]);
		expect(declaredStatuses("/derived-children/custom/validated-query", "get")).toEqual([400, 413, 415, 422, 500]);
		expect(declaredStatuses("/derived-children/custom/client-closed", "post")).toEqual([400, 413, 415, 499, 500]);
	});

	it("declares 401 and 403 from any configured guard, and neither without one", () => {
		for (const path of ["/derived-route-guard", "/derived-guard-above", "/derived-guard-below", "/derived-request-scoped"]) {
			expect(declaredStatuses(path, "get"), path).toEqual([400, 401, 403, 413, 415, 500]);
		}

		expect(declaredStatuses("/derived-guarded-sibling/custom/shared", "get")).toEqual([400, 401, 403, 413, 415, 500]);
		expect(declaredStatuses("/derived-children/custom/handler-guard", "post")).toEqual([400, 401, 403, 413, 415, 500]);
		expect(declaredStatuses("/derived-unguarded", "get")).toEqual([400, 413, 415, 500]);
	});

	it("requires only statusCode and message on every declared error schema", () => {
		const schemas: Array<[string, { required?: Array<string> }]> = Object.entries(document.components?.schemas ?? {}).filter(([name]: [string, unknown]): boolean => name.startsWith("Exception") && name.endsWith("DTO") && !name.includes("Details")) as Array<[string, { required?: Array<string> }]>;

		expect(schemas.length).toBeGreaterThan(0);

		for (const [name, schema] of schemas) {
			expect(schema.required?.toSorted(), name).toEqual(["message", "statusCode"]);
		}
	});

	it("declares 403 and no 404 on a securable CREATE, which refuses a body outside the policy scope with 403", () => {
		expect(declaredStatuses("/derived-scoped", "post")).toEqual([400, 403, 409, 413, 415, 500]);
		expect(declaredStatuses("/derived-open", "post")).toEqual([400, 409, 413, 415, 500]);
	});

	it("declares 403 on a route of a decorated base only for the sibling that can answer it", () => {
		expect(declaredStatuses("/derived-securable-sibling/custom/shared", "get")).toEqual([400, 403, 413, 415, 500]);
		expect(declaredStatuses("/derived-plain-sibling/custom/shared", "get")).toEqual([400, 413, 415, 500]);
	});

	it("refuses the securable sibling with its declared 403", async () => {
		expect((await fetch(`${baseUrl}/derived-securable-sibling/custom/shared`)).status).toBe(HttpStatus.FORBIDDEN);
	});

	it("answers the plain sibling without a refusal", async () => {
		expect((await fetch(`${baseUrl}/derived-plain-sibling/custom/shared`)).status).toBe(HttpStatus.OK);
	});

	it("resolves every component reference", () => {
		expectEveryReferenceToResolve(document);
	});

	it("creates a row inside the policy scope", async () => {
		const response: Response = await fetch(`${baseUrl}/derived-scoped`, { body: JSON.stringify({ id: "scoped-in", name: "visible" }), headers: { "content-type": "application/json" }, method: "POST" });

		expect(response.status).toBe(HttpStatus.CREATED);
	});
});
