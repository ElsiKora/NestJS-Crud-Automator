import "reflect-metadata";

import type { INestApplication, Type } from "@nestjs/common";
import type { OpenAPIObject } from "@nestjs/swagger";
import type { TestingModule } from "@nestjs/testing";

import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { REQUEST } from "@nestjs/core";
import { ExpressAdapter } from "@nestjs/platform-express";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Test } from "@nestjs/testing";
import { getRepositoryToken, InjectRepository, TypeOrmModule } from "@nestjs/typeorm";
import { Column, Entity, PrimaryColumn, Repository } from "typeorm";
import { afterEach, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiAuthorizationPolicy, ApiAuthorizationPolicyBase, ApiController, ApiControllerSecurable, ApiPropertyDescribe, ApiService, ApiServiceBase, ApiSubscriberModule, EApiAuthorizationMode, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "../../src/index";

type TClassDecorator = (target: TController) => TController;

type TController = Type<unknown>;

@Entity("disabled_route_inheritance_items")
class DisabledRouteInheritanceItemEntity {
	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe({ description: "disabledRouteInheritanceItemId", exampleValue: "row-1", format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING })
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({ description: "disabledRouteInheritanceItemName", exampleValue: "Name", format: EApiPropertyStringType.STRING, maxLength: 100, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING })
	public name!: string;
}

@Injectable()
@ApiService({ entity: DisabledRouteInheritanceItemEntity })
class DisabledRouteInheritanceItemService extends ApiServiceBase<DisabledRouteInheritanceItemEntity> {
	@InjectRepository(DisabledRouteInheritanceItemEntity)
	public readonly repository!: Repository<DisabledRouteInheritanceItemEntity>;
}

@Injectable()
@ApiAuthorizationPolicy({ entity: DisabledRouteInheritanceItemEntity })
class DisabledRouteInheritanceItemPolicy extends ApiAuthorizationPolicyBase<DisabledRouteInheritanceItemEntity> {}

class DisabledRouteInheritanceBase {
	@Inject(DisabledRouteInheritanceItemService)
	public readonly service!: DisabledRouteInheritanceItemService;
}

const DISABLED: { generation: { isEnabled: false } } = { generation: { isEnabled: false } };

const ALL_DISABLED: Record<EApiRouteType, typeof DISABLED> = {
	[EApiRouteType.CREATE]: DISABLED,
	[EApiRouteType.DELETE]: DISABLED,
	[EApiRouteType.GET]: DISABLED,
	[EApiRouteType.GET_LIST]: DISABLED,
	[EApiRouteType.PARTIAL_UPDATE]: DISABLED,
	[EApiRouteType.UPDATE]: DISABLED,
};

// Every generated route type, as a request that its route would answer
const ROUTES: ReadonlyArray<{ body?: object; method: string; suffix: string }> = [
	{ body: { id: "row-2", name: "Name" }, method: "POST", suffix: "" },
	{ method: "GET", suffix: "?limit=10&page=1" },
	{ method: "GET", suffix: "/row-1" },
	{ body: { id: "row-1", name: "Other" }, method: "PUT", suffix: "/row-1" },
	{ body: { name: "Other" }, method: "PATCH", suffix: "/row-1" },
	{ method: "DELETE", suffix: "/row-1" },
];

const ADAPTERS: Record<string, () => ExpressAdapter | FastifyAdapter> = { express: (): ExpressAdapter => new ExpressAdapter(), fastify: (): FastifyAdapter => new FastifyAdapter() };

const securable: TClassDecorator = ApiControllerSecurable() as unknown as TClassDecorator;

/**
 * Builds the `ApiController` decorator of one test controller.
 * @param {string} path - Controller path.
 * @param {boolean} isSecured - Whether the controller declares an authorization block.
 * @param {Record<EApiRouteType, typeof DISABLED>} [routes] - Route configs.
 * @returns {TClassDecorator} The decorator.
 */
function controller(path: string, isSecured: boolean, routes: Partial<Record<EApiRouteType, typeof DISABLED>> = {}): TClassDecorator {
	return ApiController<DisabledRouteInheritanceItemEntity>({ ...(isSecured ? { authorization: { defaultMode: EApiAuthorizationMode.HOOKS } } : {}), entity: DisabledRouteInheritanceItemEntity, path, routes } as never) as unknown as TClassDecorator;
}

/**
 * Applies class decorators listed top to bottom, as source order lists them.
 * @param {TController} target - Class to decorate.
 * @param {...TClassDecorator} decorators - Decorators, top first.
 * @returns {TController} The decorated class.
 */
function decorate(target: TController, ...decorators: Array<TClassDecorator>): TController {
	let current: TController = target;

	for (const decorator of [...decorators].reverse()) {
		current = decorator(current) ?? current;
	}

	return current;
}

/**
 * Creates a named subclass, so that every controller of the matrix has its own schema prefix.
 * @param {string} name - Class name.
 * @param {TController} parent - Parent class.
 * @returns {TController} The subclass.
 */
function subclass(name: string, parent: TController): TController {
	const holder: Record<string, TController> = { [name]: class extends (parent as new () => object) {} };

	return holder[name] as TController;
}

/**
 * Makes a class REQUEST-scoped by injecting the request, so that Nest constructs it only on a request.
 * @param {TController} target - Class to scope.
 * @returns {TController} The same class.
 */
function requestScoped(target: TController): TController {
	Inject(REQUEST)(target.prototype as object, "request");

	return target;
}

// Parents that generate every route, in the shapes a child can inherit from
const PARENTS: Record<string, (tag: string) => TController> = {
	"an intermediate class with only @ApiControllerSecurable()": (tag: string): TController => decorate(subclass(`DisabledRouteIntermediate${tag}`, decorate(subclass(`DisabledRouteIntermediateParent${tag}`, DisabledRouteInheritanceBase), controller(`intermediate-parent-${tag}`, true))), securable),
	"a plain parent": (tag: string): TController => decorate(subclass(`DisabledRoutePlainParent${tag}`, DisabledRouteInheritanceBase), controller(`plain-parent-${tag}`, false)),
	"a parent with securable above @ApiController": (tag: string): TController => decorate(subclass(`DisabledRouteSecurableAboveParent${tag}`, DisabledRouteInheritanceBase), securable, controller(`securable-above-parent-${tag}`, true)),
	"a parent with securable below @ApiController": (tag: string): TController => decorate(subclass(`DisabledRouteSecurableBelowParent${tag}`, DisabledRouteInheritanceBase), controller(`securable-below-parent-${tag}`, true), securable),
};

// Children that disable every route
const CHILDREN: Record<string, (name: string, parent: TController, path: string) => TController> = {
	"securable above @ApiController": (name: string, parent: TController, path: string): TController => decorate(subclass(name, parent), securable, controller(path, true, ALL_DISABLED)),
	"securable below @ApiController": (name: string, parent: TController, path: string): TController => decorate(subclass(name, parent), controller(path, true, ALL_DISABLED), securable),
};

const applications: Array<INestApplication> = [];

let counter: number = 0;

/**
 * Starts an application that serves the given controllers.
 * @param {string} adapter - HTTP adapter key.
 * @param {Array<TController>} controllers - Controllers to serve.
 * @returns {Promise<INestApplication>} The listening application.
 */
async function boot(adapter: string, controllers: Array<TController>): Promise<INestApplication> {
	const moduleReference: TestingModule = await Test.createTestingModule({
		controllers,
		imports: [TypeOrmModule.forRoot({ database: ":memory:", dropSchema: true, entities: [DisabledRouteInheritanceItemEntity], logging: false, synchronize: true, type: "better-sqlite3" }), TypeOrmModule.forFeature([DisabledRouteInheritanceItemEntity]), ApiAuthorizationModule.forRoot(), ApiSubscriberModule],
		providers: [DisabledRouteInheritanceItemService, DisabledRouteInheritanceItemPolicy],
	}).compile();
	const application: INestApplication = moduleReference.createNestApplication((ADAPTERS[adapter] as () => ExpressAdapter | FastifyAdapter)(), { logger: false });

	applications.push(application);
	await application.listen(0, "127.0.0.1");
	await application.get<Repository<DisabledRouteInheritanceItemEntity>>(getRepositoryToken(DisabledRouteInheritanceItemEntity)).save({ id: "row-1", name: "Name" });

	return application;
}

/**
 * Lists the generated routes under a path that Nest still serves: anything but its own 404 for an unknown route.
 * @param {INestApplication} application - Listening application.
 * @param {string} path - Controller path.
 * @returns {Promise<Array<string>>} The served routes with their status.
 */
async function getServedRoutes(application: INestApplication, path: string): Promise<Array<string>> {
	const url: string = await application.getUrl();
	const served: Array<string> = [];

	for (const route of ROUTES) {
		const response: Response = await fetch(`${url}/${path}${route.suffix}`, { body: route.body === undefined ? undefined : JSON.stringify(route.body), headers: route.body === undefined ? {} : { "content-type": "application/json" }, method: route.method });
		const text: string = await response.text();

		if (response.status !== HttpStatus.NOT_FOUND || !text.includes(`Cannot ${route.method}`)) {
			served.push(`${route.method} /${path}${route.suffix} -> ${String(response.status)}`);
		}
	}

	return served;
}

/**
 * Lists the OpenAPI paths of an application under a controller path.
 * @param {INestApplication} application - Application.
 * @param {string} path - Controller path.
 * @returns {Array<string>} The documented paths.
 */
function getDocumentedPaths(application: INestApplication, path: string): Array<string> {
	const document: OpenAPIObject = SwaggerModule.createDocument(application, new DocumentBuilder().build());

	return Object.keys(document.paths).filter((documentedPath: string): boolean => documentedPath === `/${path}` || documentedPath.startsWith(`/${path}/`));
}

afterEach(async () => {
	for (const application of applications.splice(0)) {
		await application.close();
	}
});

describe("a route disabled on a child controller stays hidden for every inherited shape", () => {
	for (const adapter of Object.keys(ADAPTERS)) {
		for (const [parentKey, createParent] of Object.entries(PARENTS)) {
			for (const [childKey, createChild] of Object.entries(CHILDREN)) {
				it(`${adapter}: a child with ${childKey} of ${parentKey}`, async () => {
					const tag: string = String(++counter);
					const child: TController = createChild(`DisabledRouteChild${tag}`, createParent(tag), `child-${tag}`);
					const application: INestApplication = await boot(adapter, [child]);

					expect(await getServedRoutes(application, `child-${tag}`)).toEqual([]);
					expect(getDocumentedPaths(application, `child-${tag}`)).toEqual([]);
				});
			}

			it(`${adapter}: a REQUEST-scoped child with securable below @ApiController of ${parentKey}`, async () => {
				const tag: string = String(++counter);
				const child: TController = decorate(requestScoped(subclass(`DisabledRouteRequestScopedChild${tag}`, createParent(tag))), controller(`request-child-${tag}`, true, ALL_DISABLED), securable);
				const application: INestApplication = await boot(adapter, [child]);

				expect(await getServedRoutes(application, `request-child-${tag}`)).toEqual([]);
				expect(getDocumentedPaths(application, `request-child-${tag}`)).toEqual([]);
			});

			it(`${adapter}: a grandchild under a child with securable below @ApiController of ${parentKey}`, async () => {
				const tag: string = String(++counter);
				const child: TController = (CHILDREN["securable below @ApiController"] as (name: string, parent: TController, path: string) => TController)(`DisabledRouteMiddleChild${tag}`, createParent(tag), `middle-${tag}`);
				const grandchild: TController = decorate(subclass(`DisabledRouteGrandchild${tag}`, child), controller(`grandchild-${tag}`, true, ALL_DISABLED), securable);
				const application: INestApplication = await boot(adapter, [child, grandchild]);

				expect(await getServedRoutes(application, `grandchild-${tag}`)).toEqual([]);
				expect(getDocumentedPaths(application, `grandchild-${tag}`)).toEqual([]);
				expect(await getServedRoutes(application, `middle-${tag}`)).toEqual([]);
			});
		}
	}
});
