import "reflect-metadata";

import type { INestApplication, Type } from "@nestjs/common";
import type { OpenAPIObject } from "@nestjs/swagger";
import type { Observable } from "rxjs";

import { All, Controller, Get, Head, HttpStatus, Inject, Injectable, Options, Post, Redirect, RequestMethod, Search, Sse, UseGuards } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Test } from "@nestjs/testing";
import { InjectRepository, TypeOrmModule } from "@nestjs/typeorm";
import { EMPTY } from "rxjs";
import { Column, Entity, PrimaryColumn, Repository } from "typeorm";
import { afterEach, describe, expect, it } from "vitest";

import { ApiAuthorizationGuard, ApiAuthorizationModule, ApiAuthorizationPolicy, ApiAuthorizationPolicyBase, ApiController, ApiControllerSecurable, ApiMethod, ApiPropertyDescribe, ApiRouteCustom, ApiService, ApiServiceBase, ApiSubscriberModule, EApiAuthorizationMode, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType, METHOD_API_DECORATOR_CONSTANT } from "../../src/index";

@Entity("securable_plain_route_items")
class SecurablePlainRouteItemEntity {
	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe({ description: "securablePlainRouteItemId", exampleValue: "row-1", format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING })
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({ description: "securablePlainRouteItemName", exampleValue: "Name", format: EApiPropertyStringType.STRING, maxLength: 100, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING })
	public name!: string;
}

@Injectable()
@ApiService({ entity: SecurablePlainRouteItemEntity })
class SecurablePlainRouteItemService extends ApiServiceBase<SecurablePlainRouteItemEntity> {
	@InjectRepository(SecurablePlainRouteItemEntity)
	public readonly repository!: Repository<SecurablePlainRouteItemEntity>;
}

@Injectable()
@ApiAuthorizationPolicy({ entity: SecurablePlainRouteItemEntity })
class SecurablePlainRouteItemPolicy extends ApiAuthorizationPolicyBase<SecurablePlainRouteItemEntity> {
	public getCustomActionRule(action: string) {
		return action === "custom.allow" ? this.allow() : [];
	}

	public onBeforeGetList() {
		return this.allow();
	}
}

const DISABLED = { generation: { isEnabled: false } } as const;

const NO_GENERATED_ROUTES = {
	[EApiRouteType.CREATE]: DISABLED,
	[EApiRouteType.DELETE]: DISABLED,
	[EApiRouteType.GET]: DISABLED,
	[EApiRouteType.GET_LIST]: DISABLED,
	[EApiRouteType.PARTIAL_UPDATE]: DISABLED,
	[EApiRouteType.UPDATE]: DISABLED,
} as const;

const ONLY_GET_LIST = { ...NO_GENERATED_ROUTES, [EApiRouteType.GET_LIST]: {} } as const;

const AUTHORIZATION = { defaultMode: EApiAuthorizationMode.HOOKS } as const;

/**
 * Builds a secured custom route on the item entity.
 * @param {string} action - Resource action the policy decides on.
 * @param {string} path - Route path.
 * @returns {never} The metadata for `@ApiMethod`.
 */
function securedRoute(action: string, path: string): never {
	return { metadata: { resource: { action, entity: SecurablePlainRouteItemEntity }, response: { status: HttpStatus.OK, type: undefined }, route: { method: RequestMethod.POST, path }, security: { authorization: { mode: EApiAuthorizationMode.HOOKS } } } } as never;
}

/**
 * Builds the startup error of a served route that skips authorization.
 * @param {string} controller - Controller name.
 * @param {string} method - Method name.
 * @param {string} route - HTTP method and path.
 * @returns {Error} The expected error.
 */
function plainRouteError(controller: string, method: string, route: string): Error {
	return new Error(`[NestJS-Crud-Automator] Controller "${controller}" method "${method}" serves ${route} without authorization: declare it with @ApiRouteCustom or @ApiMethod, or move it to a controller that is not securable`);
}

class SecurablePlainRouteItemController {
	@Inject(SecurablePlainRouteItemService)
	public readonly service!: SecurablePlainRouteItemService;
}

@ApiControllerSecurable()
@ApiController<SecurablePlainRouteItemEntity>({ authorization: AUTHORIZATION, entity: SecurablePlainRouteItemEntity, path: "plain-get", routes: NO_GENERATED_ROUTES })
class PlainGetController extends SecurablePlainRouteItemController {
	@Get("report")
	public report(): { isReached: boolean } {
		return { isReached: true };
	}
}

class SecuredBaseController extends SecurablePlainRouteItemController {
	@ApiMethod<SecurablePlainRouteItemEntity>(securedRoute("custom.deny", "publish"))
	public publish(): { isReached: boolean } {
		return { isReached: true };
	}
}

@ApiControllerSecurable()
@ApiController<SecurablePlainRouteItemEntity>({ authorization: AUTHORIZATION, entity: SecurablePlainRouteItemEntity, path: "plain-override", routes: NO_GENERATED_ROUTES })
class PlainOverrideController extends SecuredBaseController {
	@Post("publish")
	public override publish(): { isReached: boolean } {
		return { isReached: true };
	}
}

abstract class AbstractPlainRouteController extends SecurablePlainRouteItemController {
	@Get("inherited")
	public inherited(): { isReached: boolean } {
		return { isReached: true };
	}
}

@ApiControllerSecurable()
@ApiController<SecurablePlainRouteItemEntity>({ authorization: AUTHORIZATION, entity: SecurablePlainRouteItemEntity, path: "inherited-plain", routes: NO_GENERATED_ROUTES })
class InheritedPlainController extends AbstractPlainRouteController {}

@ApiControllerSecurable()
@ApiController<SecurablePlainRouteItemEntity>({ authorization: AUTHORIZATION, entity: SecurablePlainRouteItemEntity, path: "generated-parent", routes: ONLY_GET_LIST })
class GeneratedParentController extends SecurablePlainRouteItemController {}

@ApiControllerSecurable()
@ApiController<SecurablePlainRouteItemEntity>({ authorization: AUTHORIZATION, entity: SecurablePlainRouteItemEntity, path: "generated-override", routes: NO_GENERATED_ROUTES })
class PlainOverrideOfGeneratedController extends GeneratedParentController {
	@Get()
	public getList(): { isReached: boolean } {
		return { isReached: true };
	}
}

@ApiControllerSecurable()
@ApiController<SecurablePlainRouteItemEntity>({ authorization: AUTHORIZATION, entity: SecurablePlainRouteItemEntity, path: "custom-override", routes: NO_GENERATED_ROUTES })
class PlainOverrideOfCustomController extends SecuredBaseController {
	@Get("custom")
	public override publish(): { isReached: boolean } {
		return { isReached: true };
	}
}

@ApiControllerSecurable()
@ApiController<SecurablePlainRouteItemEntity>({ authorization: AUTHORIZATION, entity: SecurablePlainRouteItemEntity, path: "many-paths", routes: NO_GENERATED_ROUTES })
class ManyPathsController extends SecurablePlainRouteItemController {
	@Get(["first", "second"])
	public report(): { isReached: boolean } {
		return { isReached: true };
	}
}

@ApiControllerSecurable()
@ApiController<SecurablePlainRouteItemEntity>({ authorization: AUTHORIZATION, entity: SecurablePlainRouteItemEntity, path: "plain-all", routes: NO_GENERATED_ROUTES })
class PlainAllController extends SecurablePlainRouteItemController {
	@All("everything")
	public everything(): { isReached: boolean } {
		return { isReached: true };
	}
}

@ApiControllerSecurable()
@ApiController<SecurablePlainRouteItemEntity>({ authorization: AUTHORIZATION, entity: SecurablePlainRouteItemEntity, path: "plain-sse", routes: NO_GENERATED_ROUTES })
class PlainSseController extends SecurablePlainRouteItemController {
	@Sse("events")
	public events(): Observable<never> {
		return EMPTY;
	}
}

@ApiControllerSecurable()
@ApiController<SecurablePlainRouteItemEntity>({ authorization: AUTHORIZATION, entity: SecurablePlainRouteItemEntity, path: "plain-redirect", routes: NO_GENERATED_ROUTES })
class PlainRedirectController extends SecurablePlainRouteItemController {
	@Get("old")
	@Redirect("/elsewhere")
	public old(): void {}
}

@ApiControllerSecurable()
@ApiController<SecurablePlainRouteItemEntity>({ authorization: AUTHORIZATION, entity: SecurablePlainRouteItemEntity, path: "plain-verbs", routes: NO_GENERATED_ROUTES })
class PlainHeadController extends SecurablePlainRouteItemController {
	@Head("status")
	public status(): void {}
}

@ApiControllerSecurable()
@ApiController<SecurablePlainRouteItemEntity>({ authorization: AUTHORIZATION, entity: SecurablePlainRouteItemEntity, path: "plain-verbs", routes: NO_GENERATED_ROUTES })
class PlainOptionsController extends SecurablePlainRouteItemController {
	@Options("status")
	public status(): void {}
}

@ApiControllerSecurable()
@ApiController<SecurablePlainRouteItemEntity>({ authorization: AUTHORIZATION, entity: SecurablePlainRouteItemEntity, path: "plain-verbs", routes: NO_GENERATED_ROUTES })
class PlainSearchController extends SecurablePlainRouteItemController {
	@Search("status")
	public status(): void {}
}

@ApiControllerSecurable()
@ApiController<SecurablePlainRouteItemEntity>({ authorization: AUTHORIZATION, entity: SecurablePlainRouteItemEntity, path: "no-guard", routes: NO_GENERATED_ROUTES })
class HandWrittenMetadataWithoutGuardController extends SecurablePlainRouteItemController {
	@Get("report")
	public report(): { isReached: boolean } {
		return { isReached: true };
	}
}

Reflect.defineMetadata(METHOD_API_DECORATOR_CONSTANT.ROUTE_METADATA_KEY, { resource: { action: "custom.deny", entity: SecurablePlainRouteItemEntity }, route: { method: RequestMethod.GET, path: "report" }, security: { authorization: { mode: EApiAuthorizationMode.HOOKS } } }, HandWrittenMetadataWithoutGuardController.prototype.report);

@Injectable()
class SubclassedAuthorizationGuard extends ApiAuthorizationGuard {}

@ApiControllerSecurable()
@ApiController<SecurablePlainRouteItemEntity>({ authorization: AUTHORIZATION, entity: SecurablePlainRouteItemEntity, path: "subclassed-guard", routes: NO_GENERATED_ROUTES })
class HandWrittenMetadataWithSubclassedGuardController extends SecurablePlainRouteItemController {
	@Get("report")
	@UseGuards(SubclassedAuthorizationGuard)
	public report(): { isReached: boolean } {
		return { isReached: true };
	}
}

Reflect.defineMetadata(METHOD_API_DECORATOR_CONSTANT.ROUTE_METADATA_KEY, { resource: { action: "custom.deny", entity: SecurablePlainRouteItemEntity }, route: { method: RequestMethod.GET, path: "report" }, security: { authorization: { mode: EApiAuthorizationMode.HOOKS } } }, HandWrittenMetadataWithSubclassedGuardController.prototype.report);

@ApiControllerSecurable()
@ApiController<SecurablePlainRouteItemEntity>({ authorization: AUTHORIZATION, entity: SecurablePlainRouteItemEntity, path: "guard-only", routes: NO_GENERATED_ROUTES })
class GuardWithoutMetadataController extends SecurablePlainRouteItemController {
	@Get("report")
	@UseGuards(ApiAuthorizationGuard)
	public report(): { isReached: boolean } {
		return { isReached: true };
	}
}

@ApiControllerSecurable()
@ApiController<SecurablePlainRouteItemEntity>({ authorization: AUTHORIZATION, entity: SecurablePlainRouteItemEntity, path: "hidden-override", routes: NO_GENERATED_ROUTES })
class UndecoratedOverrideController extends SecuredBaseController {
	public override publish(): { isReached: boolean } {
		return { isReached: true };
	}
}

@ApiControllerSecurable()
@ApiController<SecurablePlainRouteItemEntity>({ authorization: AUTHORIZATION, entity: SecurablePlainRouteItemEntity, path: "helpers", routes: NO_GENERATED_ROUTES })
class HelperMethodsController extends SecurablePlainRouteItemController {
	public get computed(): string {
		throw new Error("The startup check ran an accessor");
	}

	public helper(): boolean {
		return true;
	}

	@ApiMethod<SecurablePlainRouteItemEntity>(securedRoute("custom.allow", "publish"))
	public publish(): { isHelped: boolean } {
		return { isHelped: this.helper() };
	}
}

@ApiController<SecurablePlainRouteItemEntity>({ entity: SecurablePlainRouteItemEntity, path: "non-securable-generated", routes: NO_GENERATED_ROUTES })
class NonSecurableGeneratedController extends SecurablePlainRouteItemController {
	@Get("report")
	public report(): { isReached: boolean } {
		return { isReached: true };
	}
}

@Controller("non-securable-nest")
class NonSecurableNestController {
	@Get("report")
	public report(): { isReached: boolean } {
		return { isReached: true };
	}
}

@ApiControllerSecurable()
@ApiController<SecurablePlainRouteItemEntity>({ authorization: AUTHORIZATION, entity: SecurablePlainRouteItemEntity, path: "declared", routes: ONLY_GET_LIST })
class DeclaredRoutesController extends SecurablePlainRouteItemController {
	@ApiMethod<SecurablePlainRouteItemEntity>(securedRoute("custom.deny", "denied"))
	public denied(): { isReached: boolean } {
		return { isReached: true };
	}

	@ApiRouteCustom<SecurablePlainRouteItemEntity>({ resource: { action: "custom.allow", entity: SecurablePlainRouteItemEntity }, response: { status: HttpStatus.OK, type: undefined }, route: { method: RequestMethod.POST, path: "allowed" }, security: { authorization: { mode: EApiAuthorizationMode.HOOKS } } } as never)
	public allowed(): { isReached: boolean } {
		return { isReached: true };
	}
}

@ApiController<SecurablePlainRouteItemEntity>({ entity: SecurablePlainRouteItemEntity, path: "open-parent", routes: ONLY_GET_LIST })
class OpenGeneratedParentController extends SecurablePlainRouteItemController {}

@ApiController<SecurablePlainRouteItemEntity>({ entity: SecurablePlainRouteItemEntity, path: "open-child", routes: NO_GENERATED_ROUTES })
class OpenChildWithDisabledRouteController extends OpenGeneratedParentController {}

@ApiControllerSecurable()
@ApiController<SecurablePlainRouteItemEntity>({ authorization: AUTHORIZATION, entity: SecurablePlainRouteItemEntity, path: "secured-child", routes: NO_GENERATED_ROUTES })
class SecuredChildWithDisabledRouteController extends GeneratedParentController {}

@ApiControllerSecurable()
@ApiController<SecurablePlainRouteItemEntity>({ authorization: AUTHORIZATION, entity: SecurablePlainRouteItemEntity, path: "secured-child-reuse", routes: NO_GENERATED_ROUTES })
class SecuredChildReusingDisabledRouteController extends GeneratedParentController {
	@ApiMethod<SecurablePlainRouteItemEntity>(securedRoute("custom.allow", "summary"))
	public summary(): { isHandlerKept: boolean } {
		return { isHandlerKept: typeof (this as unknown as { getList?: unknown }).getList === "function" };
	}
}

class CustomGetListBaseController extends SecurablePlainRouteItemController {
	@ApiMethod<SecurablePlainRouteItemEntity>({ metadata: { resource: { action: "custom.allow", entity: SecurablePlainRouteItemEntity }, response: { status: HttpStatus.OK, type: undefined }, route: { method: RequestMethod.GET, path: "" }, security: { authorization: { mode: EApiAuthorizationMode.HOOKS } } } } as never)
	public getList(): { isCustom: boolean } {
		return { isCustom: true };
	}
}

@ApiControllerSecurable()
@ApiController<SecurablePlainRouteItemEntity>({ authorization: AUTHORIZATION, entity: SecurablePlainRouteItemEntity, path: "custom-get-list", routes: NO_GENERATED_ROUTES })
class ChildOfCustomGetListController extends CustomGetListBaseController {}

class PlainSubclassOfGeneratedController extends GeneratedParentController {}

describe("Served routes of securable controllers (E2E)", () => {
	const applications: Array<INestApplication> = [];

	/**
	 * Boots the controllers through the real bootstrap and opens a real socket.
	 * @param {Array<Type<unknown>>} controllers - Controllers to serve.
	 * @returns {Promise<INestApplication>} The listening application.
	 */
	async function boot(controllers: Array<Type<unknown>>): Promise<INestApplication> {
		const moduleReference = await Test.createTestingModule({
			controllers,
			imports: [TypeOrmModule.forRoot({ database: ":memory:", dropSchema: true, entities: [SecurablePlainRouteItemEntity], logging: false, synchronize: true, type: "better-sqlite3" }), TypeOrmModule.forFeature([SecurablePlainRouteItemEntity]), ApiAuthorizationModule.forRoot(), ApiSubscriberModule],
			providers: [SecurablePlainRouteItemService, SecurablePlainRouteItemPolicy],
		}).compile();
		const application: INestApplication = moduleReference.createNestApplication(new FastifyAdapter(), { logger: false });

		applications.push(application);
		await application.listen(0, "127.0.0.1");

		return application;
	}

	/**
	 * Sends one request over the socket of a listening application.
	 * @param {INestApplication} application - Listening application.
	 * @param {string} method - HTTP method.
	 * @param {string} path - Request path.
	 * @returns {Promise<Response>} The response.
	 */
	async function request(application: INestApplication, method: string, path: string): Promise<Response> {
		return await fetch(`${await application.getUrl()}${path}`, { method });
	}

	afterEach(async () => {
		for (const application of applications.splice(0)) {
			await application.close().catch((): void => undefined);
		}
	});

	describe("a served route that skips authorization stops the application", () => {
		it("refuses a plain @Get", async () => {
			await expect(boot([PlainGetController])).rejects.toThrow(plainRouteError("PlainGetController", "report", "GET /plain-get/report"));
		});

		it("refuses a plain @Post override of a secured route", async () => {
			await expect(boot([PlainOverrideController])).rejects.toThrow(plainRouteError("PlainOverrideController", "publish", "POST /plain-override/publish"));
		});

		it("refuses a plain route inherited from an abstract base", async () => {
			await expect(boot([InheritedPlainController])).rejects.toThrow(plainRouteError("InheritedPlainController", "inherited", "GET /inherited-plain/inherited"));
		});

		it("refuses a plain override of a generated route", async () => {
			await expect(boot([PlainOverrideOfGeneratedController])).rejects.toThrow(plainRouteError("PlainOverrideOfGeneratedController", "getList", "GET /generated-override"));
		});

		it("refuses a plain override of a custom route that moves its path", async () => {
			await expect(boot([PlainOverrideOfCustomController])).rejects.toThrow(plainRouteError("PlainOverrideOfCustomController", "publish", "GET /custom-override/custom"));
		});

		it("names every path of a plain route", async () => {
			await expect(boot([ManyPathsController])).rejects.toThrow(plainRouteError("ManyPathsController", "report", "GET /many-paths/first, /many-paths/second"));
		});

		it.each<[string, Type<unknown>, string, string, string]>([
			["@All", PlainAllController, "PlainAllController", "everything", "ALL /plain-all/everything"],
			["@Sse", PlainSseController, "PlainSseController", "events", "GET /plain-sse/events"],
			["@Redirect with a route", PlainRedirectController, "PlainRedirectController", "old", "GET /plain-redirect/old"],
			["@Head", PlainHeadController, "PlainHeadController", "status", "HEAD /plain-verbs/status"],
			["@Options", PlainOptionsController, "PlainOptionsController", "status", "OPTIONS /plain-verbs/status"],
			["@Search", PlainSearchController, "PlainSearchController", "status", "SEARCH /plain-verbs/status"],
		])("refuses %s", async (_decorator: string, controller: Type<unknown>, name: string, method: string, route: string) => {
			await expect(boot([controller])).rejects.toThrow(plainRouteError(name, method, route));
		});

		it("refuses hand-written route metadata without the authorization guard", async () => {
			await expect(boot([HandWrittenMetadataWithoutGuardController])).rejects.toThrow(plainRouteError("HandWrittenMetadataWithoutGuardController", "report", "GET /no-guard/report"));
		});

		it("refuses the authorization guard without route metadata", async () => {
			await expect(boot([GuardWithoutMetadataController])).rejects.toThrow(plainRouteError("GuardWithoutMetadataController", "report", "GET /guard-only/report"));
		});
	});

	describe("what is not a served route keeps starting", () => {
		it("does not serve an override with no route decorator", async () => {
			const application: INestApplication = await boot([UndecoratedOverrideController]);

			expect((await request(application, "POST", "/hidden-override/publish")).status).toBe(HttpStatus.NOT_FOUND);
		});

		it("ignores helper methods and accessors", async () => {
			const application: INestApplication = await boot([HelperMethodsController]);
			const response: Response = await request(application, "POST", "/helpers/publish");

			expect(response.status).toBe(HttpStatus.OK);
			await expect(response.json()).resolves.toEqual({ isHelped: true });
			expect((await request(application, "GET", "/helpers/helper")).status).toBe(HttpStatus.NOT_FOUND);
		});
	});

	describe("declared routes keep going through authorization", () => {
		it("serves generated, @ApiMethod and @ApiRouteCustom routes behind the guard", async () => {
			const application: INestApplication = await boot([DeclaredRoutesController]);

			expect((await request(application, "GET", "/declared?limit=10&page=1")).status).toBe(HttpStatus.OK);
			expect((await request(application, "POST", "/declared/denied")).status).toBe(HttpStatus.FORBIDDEN);
			expect((await request(application, "POST", "/declared/allowed")).status).toBe(HttpStatus.OK);
		});

		it("accepts hand-written route metadata behind a subclass of the authorization guard", async () => {
			const application: INestApplication = await boot([HandWrittenMetadataWithSubclassedGuardController]);

			expect((await request(application, "GET", "/subclassed-guard/report")).status).toBe(HttpStatus.FORBIDDEN);
		});
	});

	describe("non-securable controllers are unaffected", () => {
		it("keeps plain routes on an @ApiController without @ApiControllerSecurable", async () => {
			const application: INestApplication = await boot([NonSecurableGeneratedController]);

			expect((await request(application, "GET", "/non-securable-generated/report")).status).toBe(HttpStatus.OK);
		});

		it("keeps plain routes on a plain Nest controller", async () => {
			const application: INestApplication = await boot([NonSecurableNestController]);

			expect((await request(application, "GET", "/non-securable-nest/report")).status).toBe(HttpStatus.OK);
		});
	});

	describe("a route disabled on a child controller is not served", () => {
		it("does not serve the generated route of the parent on a non-securable child", async () => {
			const application: INestApplication = await boot([OpenChildWithDisabledRouteController]);

			expect((await request(application, "GET", "/open-child?limit=10&page=1")).status).toBe(HttpStatus.NOT_FOUND);
		});

		it("does not serve the generated route of the parent on a securable child", async () => {
			const application: INestApplication = await boot([SecuredChildWithDisabledRouteController]);

			expect((await request(application, "GET", "/secured-child?limit=10&page=1")).status).toBe(HttpStatus.NOT_FOUND);
		});

		it("leaves the disabled route out of the OpenAPI document", async () => {
			const application: INestApplication = await boot([SecuredChildWithDisabledRouteController]);
			const document: OpenAPIObject = SwaggerModule.createDocument(application, new DocumentBuilder().build());

			expect(document.paths["/secured-child"]).toBeUndefined();
		});

		it("keeps the generated handler callable from the child", async () => {
			const application: INestApplication = await boot([SecuredChildReusingDisabledRouteController]);
			const response: Response = await request(application, "POST", "/secured-child-reuse/summary");

			expect(response.status).toBe(HttpStatus.OK);
			await expect(response.json()).resolves.toEqual({ isHandlerKept: true });
			expect((await request(application, "GET", "/secured-child-reuse?limit=10&page=1")).status).toBe(HttpStatus.NOT_FOUND);
		});

		it("keeps a custom route of the base class under the same method name", async () => {
			const application: INestApplication = await boot([ChildOfCustomGetListController]);
			const response: Response = await request(application, "GET", "/custom-get-list");

			expect(response.status).toBe(HttpStatus.OK);
			await expect(response.json()).resolves.toEqual({ isCustom: true });
		});

		it("keeps the parent routes on a subclass without @ApiController", async () => {
			const application: INestApplication = await boot([PlainSubclassOfGeneratedController]);

			expect((await request(application, "GET", "/generated-parent?limit=10&page=1")).status).toBe(HttpStatus.OK);
		});

		it("keeps serving the route on the parent itself", async () => {
			const application: INestApplication = await boot([OpenGeneratedParentController]);

			expect((await request(application, "GET", "/open-parent?limit=10&page=1")).status).toBe(HttpStatus.OK);
		});
	});
});
