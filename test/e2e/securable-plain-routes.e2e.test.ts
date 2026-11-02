import "reflect-metadata";

import type { CanActivate, DynamicModule, INestApplication, INestMicroservice, OnModuleInit, Provider, Type } from "@nestjs/common";
import type { ClientProxy } from "@nestjs/microservices";
import type { OpenAPIObject } from "@nestjs/swagger";
import type { TestingModule } from "@nestjs/testing";
import type { AddressInfo } from "node:net";
import type { Observable } from "rxjs";
import type { Socket } from "socket.io-client";

import type { IApiAuthorizationDecision, IApiAuthorizationPolicySubscriberContext } from "../../src/index";

import { All, Controller, Get, Head, HttpStatus, Inject, Injectable, Module, Options, Post, Redirect, RequestMethod, Scope, Search, Sse, UseGuards, Version } from "@nestjs/common";
import { PATH_METADATA, VERSION_METADATA } from "@nestjs/common/internal";
import { APP_GUARD, REQUEST, RouterModule } from "@nestjs/core";
import { ClientProxyFactory, EventPattern, MessagePattern, Transport } from "@nestjs/microservices";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Test } from "@nestjs/testing";
import { getRepositoryToken, InjectRepository, TypeOrmModule } from "@nestjs/typeorm";
import { SubscribeMessage, WebSocketGateway } from "@nestjs/websockets";
import { createServer } from "node:net";
import { EMPTY, firstValueFrom, timeout } from "rxjs";
import { io } from "socket.io-client";
import { Column, Entity, PrimaryColumn, Repository } from "typeorm";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
	ApiAuthorizationBootstrapValidationService,
	ApiAuthorizationGuard,
	ApiAuthorizationModule,
	ApiAuthorizationPolicy,
	ApiAuthorizationPolicyBase,
	ApiAuthorizationRuntime,
	ApiController,
	ApiControllerSecurable,
	ApiMethod,
	ApiPropertyDescribe,
	ApiRouteCustom,
	ApiService,
	ApiServiceBase,
	ApiSubscriberModule,
	EApiAuthorizationDecisionType,
	EApiAuthorizationMode,
	EApiAuthorizationPrincipalType,
	EApiPolicyEffect,
	EApiPropertyDescribeType,
	EApiPropertyStringType,
	EApiRouteType,
	METHOD_API_DECORATOR_CONSTANT,
} from "../../src/index";

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
	public getCustomActionRule(action: string, context: IApiAuthorizationPolicySubscriberContext<SecurablePlainRouteItemEntity>) {
		if (action === "custom.admin") {
			return context.principal.roles.includes("admin") ? this.allow() : [];
		}

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

const ONLY_GET = { ...NO_GENERATED_ROUTES, [EApiRouteType.GET]: {} } as const;

const AUTHORIZATION = { defaultMode: EApiAuthorizationMode.HOOKS } as const;

const ATTACKER_PAYLOAD = { user: { id: "attacker", roles: ["admin"] } } as const;

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
	return new Error(`[NestJS-Crud-Automator] Controller "${controller}" method "${method}" serves ${route} without authorization: declare it with @ApiRouteCustom or @ApiMethod, or move it to a controller that is not securable. Route metadata written by hand also needs ApiAuthorizationGuard or a subclass of it in @UseGuards on the method or the controller; a guard instance and APP_GUARD do not count`);
}

/**
 * Builds the startup error of a securable controller in an application without the authorization module.
 * @param {string} controller - Controller name.
 * @returns {Error} The expected error.
 */
function missingModuleError(controller: string): Error {
	return new Error(`[NestJS-Crud-Automator] Controller "${controller}" is marked with @ApiControllerSecurable() but the application does not import ApiAuthorizationModule, so nothing would validate or authorize its routes: import ApiAuthorizationModule, or remove @ApiControllerSecurable()`);
}

/**
 * Builds the startup error of a handler replaced on the controller instance without its authorization.
 * @param {string} controller - Controller name.
 * @param {string} method - Method name.
 * @param {string} route - HTTP method and path.
 * @returns {Error} The expected error.
 */
function replacedHandlerError(controller: string, method: string, route: string): Error {
	return new Error(`[NestJS-Crud-Automator] Controller "${controller}" method "${method}" serves ${route} through a function set on the controller instance, and Nest takes guards from that function, so the handler skips authorization: remove the assignment, for example this.${method} = this.${method}.bind(this) in the constructor. Nest already calls a handler with this set to the controller`);
}

/**
 * Builds the startup error of a handler that a microservice or WebSocket transport calls.
 * @param {string} controller - Controller name.
 * @param {string} method - Method name.
 * @param {string} pattern - The pattern as JSON.
 * @returns {Error} The expected error.
 */
function patternHandlerError(controller: string, method: string, pattern: string): Error {
	return new Error(`[NestJS-Crud-Automator] Controller "${controller}" method "${method}" handles pattern ${pattern}, and that transport has no identity that authorization can trust: move it to a controller that is not securable`);
}

/**
 * Replaces a handler on the instance with a bound copy, the way a constructor of a consumer does.
 * @param {object} instance - Controller instance.
 * @param {string} method - Method name.
 * @param {ReadonlyArray<unknown>} [metadataKeys] - Metadata keys to copy to the bound function.
 * @returns {void}
 */
function bindHandler(instance: object, method: string, metadataKeys: ReadonlyArray<unknown> = []): void {
	const handlers: Record<string, (...arguments_: Array<unknown>) => unknown> = instance as Record<string, (...arguments_: Array<unknown>) => unknown>;
	const original: (...arguments_: Array<unknown>) => unknown = handlers[method] as (...arguments_: Array<unknown>) => unknown;
	const bound: (...arguments_: Array<unknown>) => unknown = original.bind(instance);

	for (const key of metadataKeys) {
		Reflect.defineMetadata(key, Reflect.getMetadata(key, original), bound);
	}

	handlers[method] = bound;
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

@ApiControllerSecurable()
@ApiController<SecurablePlainRouteItemEntity>({ authorization: AUTHORIZATION, entity: SecurablePlainRouteItemEntity, path: "generated-get-parent", routes: ONLY_GET })
class GeneratedGetParentController extends SecurablePlainRouteItemController {}

@ApiControllerSecurable()
@ApiController<SecurablePlainRouteItemEntity>({ authorization: AUTHORIZATION, entity: SecurablePlainRouteItemEntity, path: "secured-child-get", routes: NO_GENERATED_ROUTES })
class SecuredChildCallingDisabledRouteController extends GeneratedGetParentController {
	@ApiMethod<SecurablePlainRouteItemEntity>(securedRoute("custom.allow", "lookup"))
	public async lookup(): Promise<unknown> {
		return await (this as unknown as { get: (...arguments_: Array<unknown>) => Promise<unknown> }).get({ id: "row-1" }, {}, {}, {});
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

@Controller("own-path")
class OwnPathSubclassOfGeneratedController extends GeneratedParentController {}

@ApiControllerSecurable()
@Controller("bare-securable")
class BareSecurableController {
	@Get("report")
	public report(): { isReached: boolean } {
		return { isReached: true };
	}
}

@ApiController<SecurablePlainRouteItemEntity>({ authorization: AUTHORIZATION, entity: SecurablePlainRouteItemEntity, path: "securable-below", routes: NO_GENERATED_ROUTES })
@ApiControllerSecurable()
class SecurableBelowApiController extends SecurablePlainRouteItemController {
	@Get("report")
	public report(): { isReached: boolean } {
		return { isReached: true };
	}
}

@ApiController<SecurablePlainRouteItemEntity>({ authorization: AUTHORIZATION, entity: SecurablePlainRouteItemEntity, path: "securable-inherited", routes: NO_GENERATED_ROUTES })
class SecurableInheritedController extends PlainGetController {}

@ApiControllerSecurable()
@Controller({ path: "request-scoped-bare", scope: Scope.REQUEST })
class RequestScopedBareController {
	@Get("report")
	public report(): { isReached: boolean } {
		return { isReached: true };
	}
}

@ApiControllerSecurable()
@ApiController<SecurablePlainRouteItemEntity>({ authorization: AUTHORIZATION, entity: SecurablePlainRouteItemEntity, path: "request-scoped-plain", routes: NO_GENERATED_ROUTES })
class RequestScopedPlainController extends SecurablePlainRouteItemController {
	@Inject(REQUEST)
	public readonly request!: unknown;

	@Get("report")
	public report(): { isReached: boolean } {
		return { isReached: true };
	}
}

@ApiControllerSecurable()
@ApiController<SecurablePlainRouteItemEntity>({ authorization: AUTHORIZATION, entity: SecurablePlainRouteItemEntity, path: "request-scoped-declared", routes: NO_GENERATED_ROUTES })
class RequestScopedDeclaredController extends SecurablePlainRouteItemController {
	@Inject(REQUEST)
	public readonly request!: unknown;

	@ApiMethod<SecurablePlainRouteItemEntity>(securedRoute("custom.deny", "denied"))
	public denied(): { isReached: boolean } {
		return { isReached: true };
	}
}

@ApiControllerSecurable()
@ApiController<SecurablePlainRouteItemEntity>({ authorization: AUTHORIZATION, entity: SecurablePlainRouteItemEntity, path: "bound-method", routes: NO_GENERATED_ROUTES })
class BoundApiMethodController extends SecurablePlainRouteItemController {
	public constructor() {
		super();
		bindHandler(this, "denied");
	}

	@ApiMethod<SecurablePlainRouteItemEntity>(securedRoute("custom.deny", "denied"))
	public denied(): { isReached: boolean } {
		return { isReached: true };
	}
}

@ApiControllerSecurable()
@ApiController<SecurablePlainRouteItemEntity>({ authorization: AUTHORIZATION, entity: SecurablePlainRouteItemEntity, path: "bound-custom", routes: NO_GENERATED_ROUTES })
class BoundApiRouteCustomController extends SecurablePlainRouteItemController {
	public constructor() {
		super();
		bindHandler(this, "denied");
	}

	@ApiRouteCustom<SecurablePlainRouteItemEntity>({ resource: { action: "custom.deny", entity: SecurablePlainRouteItemEntity }, response: { status: HttpStatus.OK, type: undefined }, route: { method: RequestMethod.POST, path: "denied" }, security: { authorization: { mode: EApiAuthorizationMode.HOOKS } } } as never)
	public denied(): { isReached: boolean } {
		return { isReached: true };
	}
}

class BoundDeleteBaseController extends SecurablePlainRouteItemController {
	public constructor() {
		super();
		bindHandler(this, "delete");
	}
}

@ApiControllerSecurable()
@ApiController<SecurablePlainRouteItemEntity>({ authorization: AUTHORIZATION, entity: SecurablePlainRouteItemEntity, path: "bound-delete", routes: { ...NO_GENERATED_ROUTES, [EApiRouteType.DELETE]: {} } })
class BoundGeneratedDeleteController extends BoundDeleteBaseController {}

@ApiControllerSecurable()
@ApiController<SecurablePlainRouteItemEntity>({ authorization: AUTHORIZATION, entity: SecurablePlainRouteItemEntity, path: "define-property", routes: NO_GENERATED_ROUTES })
class DefinePropertyOverParentController extends SecuredBaseController {
	public constructor() {
		super();
		Object.defineProperty(this, "publish", { value: (): { isReached: boolean } => ({ isReached: true }), writable: true });
	}
}

@ApiControllerSecurable()
@ApiController<SecurablePlainRouteItemEntity>({ authorization: AUTHORIZATION, entity: SecurablePlainRouteItemEntity, path: "request-scoped-bound", routes: NO_GENERATED_ROUTES })
class RequestScopedBoundController extends SecurablePlainRouteItemController {
	@Inject(REQUEST)
	public readonly request!: unknown;

	public constructor() {
		super();
		bindHandler(this, "denied");
	}

	@ApiMethod<SecurablePlainRouteItemEntity>(securedRoute("custom.deny", "denied"))
	public denied(): { isReached: boolean } {
		return { isReached: true };
	}
}

@ApiControllerSecurable()
@ApiController<SecurablePlainRouteItemEntity>({ authorization: AUTHORIZATION, entity: SecurablePlainRouteItemEntity, path: "request-scoped-partial", routes: NO_GENERATED_ROUTES })
class RequestScopedPartialCopyController extends SecurablePlainRouteItemController {
	@Inject(REQUEST)
	public readonly request!: unknown;

	public constructor() {
		super();
		bindHandler(this, "allowed", [METHOD_API_DECORATOR_CONSTANT.ROUTE_METADATA_KEY]);
	}

	@ApiMethod<SecurablePlainRouteItemEntity>(securedRoute("custom.allow", "allowed"))
	public allowed(): { isReached: boolean } {
		return { isReached: true };
	}
}

@ApiControllerSecurable()
@ApiController<SecurablePlainRouteItemEntity>({ authorization: AUTHORIZATION, entity: SecurablePlainRouteItemEntity, path: "partial-copy", routes: NO_GENERATED_ROUTES })
class PartialCopyController extends SecurablePlainRouteItemController {
	public constructor() {
		super();
		bindHandler(this, "allowed", [METHOD_API_DECORATOR_CONSTANT.ROUTE_METADATA_KEY]);
	}

	@ApiMethod<SecurablePlainRouteItemEntity>(securedRoute("custom.allow", "allowed"))
	public allowed(): { isReached: boolean } {
		return { isReached: true };
	}
}

@ApiControllerSecurable()
@ApiController<SecurablePlainRouteItemEntity>({ authorization: AUTHORIZATION, entity: SecurablePlainRouteItemEntity, path: "full-copy", routes: NO_GENERATED_ROUTES })
class FullCopyController extends SecurablePlainRouteItemController {
	public constructor() {
		super();

		const handlers: { allowed: object; denied: object } = this as unknown as { allowed: object; denied: object };

		bindHandler(this, "allowed", Reflect.getMetadataKeys(handlers.allowed));
		bindHandler(this, "denied", Reflect.getMetadataKeys(handlers.denied));
	}

	@ApiMethod<SecurablePlainRouteItemEntity>(securedRoute("custom.allow", "allowed"))
	public allowed(): { isReached: boolean } {
		return { isReached: true };
	}

	@ApiMethod<SecurablePlainRouteItemEntity>(securedRoute("custom.deny", "denied"))
	public denied(): { isReached: boolean } {
		return { isReached: true };
	}
}

@ApiControllerSecurable()
@ApiController<SecurablePlainRouteItemEntity>({ authorization: AUTHORIZATION, entity: SecurablePlainRouteItemEntity, path: "counted", routes: NO_GENERATED_ROUTES })
class CountedPolicyController extends SecurablePlainRouteItemController {
	@ApiMethod<SecurablePlainRouteItemEntity>(securedRoute("custom.allow", "counted"))
	public counted(): { isReached: boolean } {
		return { isReached: true };
	}
}

@ApiControllerSecurable()
@ApiController<SecurablePlainRouteItemEntity>({ authorization: AUTHORIZATION, entity: SecurablePlainRouteItemEntity, path: "subclassed-guard-allowed", routes: NO_GENERATED_ROUTES })
class SubclassedGuardAllowedController extends SecurablePlainRouteItemController {
	@Get("report")
	@UseGuards(SubclassedAuthorizationGuard)
	public report(): { isReached: boolean } {
		return { isReached: true };
	}
}

Reflect.defineMetadata(METHOD_API_DECORATOR_CONSTANT.ROUTE_METADATA_KEY, { resource: { action: "custom.allow", entity: SecurablePlainRouteItemEntity }, route: { method: RequestMethod.GET, path: "report" }, security: { authorization: { mode: EApiAuthorizationMode.HOOKS } } }, SubclassedGuardAllowedController.prototype.report);

@ApiControllerSecurable()
@UseGuards(ApiAuthorizationGuard)
@ApiController<SecurablePlainRouteItemEntity>({ authorization: AUTHORIZATION, entity: SecurablePlainRouteItemEntity, path: "class-guard-allowed", routes: NO_GENERATED_ROUTES })
class ClassGuardAllowedController extends SecurablePlainRouteItemController {
	@Get("report")
	public report(): { isReached: boolean } {
		return { isReached: true };
	}
}

Reflect.defineMetadata(METHOD_API_DECORATOR_CONSTANT.ROUTE_METADATA_KEY, { resource: { action: "custom.allow", entity: SecurablePlainRouteItemEntity }, route: { method: RequestMethod.GET, path: "report" }, security: { authorization: { mode: EApiAuthorizationMode.HOOKS } } }, ClassGuardAllowedController.prototype.report);

@ApiControllerSecurable()
@ApiController<SecurablePlainRouteItemEntity>({ authorization: AUTHORIZATION, entity: SecurablePlainRouteItemEntity, path: "stripped-path", routes: NO_GENERATED_ROUTES })
class StrippedPathController extends SecurablePlainRouteItemController {
	@Get("report")
	public report(): { isReached: boolean } {
		return { isReached: true };
	}
}

@Injectable()
class StripPathOnModuleInit implements OnModuleInit {
	public onModuleInit(): void {
		Reflect.deleteMetadata(PATH_METADATA, StrippedPathController.prototype.report);
	}
}

@ApiControllerSecurable()
@ApiController<SecurablePlainRouteItemEntity>({ authorization: AUTHORIZATION, entity: SecurablePlainRouteItemEntity, path: "app-guard", routes: NO_GENERATED_ROUTES })
class AppGuardOnlyController extends SecurablePlainRouteItemController {
	@Get("report")
	public report(): { isReached: boolean } {
		return { isReached: true };
	}
}

Reflect.defineMetadata(METHOD_API_DECORATOR_CONSTANT.ROUTE_METADATA_KEY, { resource: { action: "custom.deny", entity: SecurablePlainRouteItemEntity }, route: { method: RequestMethod.GET, path: "report" }, security: { authorization: { mode: EApiAuthorizationMode.HOOKS } } }, AppGuardOnlyController.prototype.report);

const SAME_NAME_GUARDS: Record<string, new () => CanActivate> = {
	ApiAuthorizationGuard: class implements CanActivate {
		public canActivate(): boolean {
			return true;
		}
	},
};

@ApiControllerSecurable()
@ApiController<SecurablePlainRouteItemEntity>({ authorization: AUTHORIZATION, entity: SecurablePlainRouteItemEntity, path: "same-name-guard", routes: NO_GENERATED_ROUTES })
class SameNameGuardController extends SecurablePlainRouteItemController {
	@Get("report")
	@UseGuards(SAME_NAME_GUARDS.ApiAuthorizationGuard as Type<CanActivate>)
	public report(): { isReached: boolean } {
		return { isReached: true };
	}
}

Reflect.defineMetadata(METHOD_API_DECORATOR_CONSTANT.ROUTE_METADATA_KEY, { resource: { action: "custom.deny", entity: SecurablePlainRouteItemEntity }, route: { method: RequestMethod.GET, path: "report" }, security: { authorization: { mode: EApiAuthorizationMode.HOOKS } } }, SameNameGuardController.prototype.report);

@ApiControllerSecurable()
@ApiController<SecurablePlainRouteItemEntity>({ authorization: AUTHORIZATION, entity: SecurablePlainRouteItemEntity, path: "guard-instance", routes: NO_GENERATED_ROUTES })
class GuardInstanceController extends SecurablePlainRouteItemController {
	@Get("report")
	@UseGuards(Object.create(ApiAuthorizationGuard.prototype) as CanActivate)
	public report(): { isReached: boolean } {
		return { isReached: true };
	}
}

Reflect.defineMetadata(METHOD_API_DECORATOR_CONSTANT.ROUTE_METADATA_KEY, { resource: { action: "custom.deny", entity: SecurablePlainRouteItemEntity }, route: { method: RequestMethod.GET, path: "report" }, security: { authorization: { mode: EApiAuthorizationMode.HOOKS } } }, GuardInstanceController.prototype.report);

@ApiControllerSecurable()
@ApiController<SecurablePlainRouteItemEntity>({ authorization: AUTHORIZATION, entity: SecurablePlainRouteItemEntity, path: "no-route-key", routes: NO_GENERATED_ROUTES })
class MetadataWithoutRouteController extends SecurablePlainRouteItemController {
	@Get("report")
	@UseGuards(ApiAuthorizationGuard)
	public report(): { isReached: boolean } {
		return { isReached: true };
	}
}

Reflect.defineMetadata(METHOD_API_DECORATOR_CONSTANT.ROUTE_METADATA_KEY, { resource: { action: "custom.allow", entity: SecurablePlainRouteItemEntity }, security: { authorization: { mode: EApiAuthorizationMode.HOOKS } } }, MetadataWithoutRouteController.prototype.report);

@ApiControllerSecurable()
@ApiController<SecurablePlainRouteItemEntity>({ authorization: AUTHORIZATION, entity: SecurablePlainRouteItemEntity, path: "hand-path", routes: NO_GENERATED_ROUTES })
class HandWrittenPathController extends SecurablePlainRouteItemController {
	public report(): { isReached: boolean } {
		return { isReached: true };
	}
}

Reflect.defineMetadata(PATH_METADATA, "report", HandWrittenPathController.prototype.report);

@ApiControllerSecurable()
@ApiController<SecurablePlainRouteItemEntity>({ authorization: AUTHORIZATION, entity: SecurablePlainRouteItemEntity, path: "versioned-handler", routes: NO_GENERATED_ROUTES })
class VersionedHandlerController extends SecurablePlainRouteItemController {
	@Get("report")
	@Version(["2", "3"])
	public report(): { isReached: boolean } {
		return { isReached: true };
	}
}

@ApiControllerSecurable()
@ApiController<SecurablePlainRouteItemEntity>({ authorization: AUTHORIZATION, entity: SecurablePlainRouteItemEntity, path: "versioned-class", routes: NO_GENERATED_ROUTES })
class VersionedClassController extends SecurablePlainRouteItemController {
	@Get("report")
	public report(): { isReached: boolean } {
		return { isReached: true };
	}
}

Reflect.defineMetadata(VERSION_METADATA, "4", VersionedClassController);

@ApiControllerSecurable()
@ApiController<SecurablePlainRouteItemEntity>({ authorization: AUTHORIZATION, entity: SecurablePlainRouteItemEntity, path: "prefixed", routes: NO_GENERATED_ROUTES })
class RouterPrefixedController extends SecurablePlainRouteItemController {
	@Get("report")
	public report(): { isReached: boolean } {
		return { isReached: true };
	}
}

@Module({ controllers: [RouterPrefixedController], imports: [TypeOrmModule.forFeature([SecurablePlainRouteItemEntity])], providers: [SecurablePlainRouteItemService] })
class RouterPrefixedModule {}

const patternHandlerCalls: Array<string> = [];

@ApiControllerSecurable()
@ApiController<SecurablePlainRouteItemEntity>({ authorization: AUTHORIZATION, entity: SecurablePlainRouteItemEntity, path: "message-pattern", routes: NO_GENERATED_ROUTES })
class MessagePatternController extends SecurablePlainRouteItemController {
	@ApiMethod<SecurablePlainRouteItemEntity>(securedRoute("custom.allow", "allowed"))
	public allowed(): { isReached: boolean } {
		return { isReached: true };
	}

	@MessagePattern("securable.message")
	public message(): { isReached: boolean } {
		patternHandlerCalls.push("securable.message");

		return { isReached: true };
	}
}

@ApiControllerSecurable()
@ApiController<SecurablePlainRouteItemEntity>({ authorization: AUTHORIZATION, entity: SecurablePlainRouteItemEntity, path: "event-pattern", routes: NO_GENERATED_ROUTES })
class EventPatternController extends SecurablePlainRouteItemController {
	@EventPattern({ cmd: "securable.event" })
	public event(_data: unknown): void {
		patternHandlerCalls.push("securable.event");
	}
}

@ApiControllerSecurable()
@ApiController<SecurablePlainRouteItemEntity>({ authorization: AUTHORIZATION, entity: SecurablePlainRouteItemEntity, path: "both-transports", routes: NO_GENERATED_ROUTES })
class ApiMethodWithPatternController extends SecurablePlainRouteItemController {
	@ApiMethod<SecurablePlainRouteItemEntity>(securedRoute("custom.admin", "admin"))
	@MessagePattern("securable.admin")
	public admin(): { isReached: boolean } {
		patternHandlerCalls.push("securable.admin");

		return { isReached: true };
	}

	@ApiMethod<SecurablePlainRouteItemEntity>(securedRoute("custom.allow", "allowed"))
	@MessagePattern("securable.allowed")
	public allowed(): { isReached: boolean } {
		patternHandlerCalls.push("securable.allowed");

		return { isReached: true };
	}
}

@ApiControllerSecurable()
@ApiController<SecurablePlainRouteItemEntity>({ authorization: AUTHORIZATION, entity: SecurablePlainRouteItemEntity, path: "both-transports-event", routes: NO_GENERATED_ROUTES })
class ApiMethodWithEventPatternController extends SecurablePlainRouteItemController {
	@ApiMethod<SecurablePlainRouteItemEntity>(securedRoute("custom.admin", "admin"))
	@EventPattern("securable.admin-event")
	public admin(_data: unknown): void {
		patternHandlerCalls.push("securable.admin-event");
	}
}

@WebSocketGateway()
@ApiControllerSecurable()
@ApiController<SecurablePlainRouteItemEntity>({ authorization: AUTHORIZATION, entity: SecurablePlainRouteItemEntity, path: "subscribe-message", routes: NO_GENERATED_ROUTES })
class SubscribeMessageController extends SecurablePlainRouteItemController {
	@ApiMethod<SecurablePlainRouteItemEntity>(securedRoute("custom.allow", "allowed"))
	public allowed(): { isReached: boolean } {
		return { isReached: true };
	}

	@SubscribeMessage("securable.controller-subscribe")
	public subscribe(): { data: boolean; event: string } {
		patternHandlerCalls.push("securable.controller-subscribe");

		return { data: true, event: "reply" };
	}
}

@ApiControllerSecurable()
@ApiController<SecurablePlainRouteItemEntity>({ authorization: AUTHORIZATION, entity: SecurablePlainRouteItemEntity, path: "api-method-subscribe", routes: NO_GENERATED_ROUTES })
class ApiMethodWithSubscribeMessageController extends SecurablePlainRouteItemController {
	@ApiMethod<SecurablePlainRouteItemEntity>(securedRoute("custom.admin", "admin"))
	@SubscribeMessage("securable.api-method-subscribe")
	public admin(): { data: boolean; event: string } {
		patternHandlerCalls.push("securable.api-method-subscribe");

		return { data: true, event: "reply" };
	}
}

@WebSocketGateway()
@ApiControllerSecurable()
class SecurableGateway {
	@SubscribeMessage("securable.gateway-subscribe")
	public subscribe(): { data: boolean; event: string } {
		patternHandlerCalls.push("securable.gateway-subscribe");

		return { data: true, event: "reply" };
	}
}

@WebSocketGateway()
@ApiControllerSecurable()
class SecurableApiMethodGateway {
	@ApiMethod<SecurablePlainRouteItemEntity>(securedRoute("custom.admin", "gateway-admin"))
	@SubscribeMessage("securable.gateway-admin")
	public admin(): { data: boolean; event: string } {
		patternHandlerCalls.push("securable.gateway-admin");

		return { data: true, event: "reply" };
	}
}

@WebSocketGateway()
class OpenGateway {
	@SubscribeMessage("open.gateway-subscribe")
	public subscribe(): { data: boolean; event: string } {
		patternHandlerCalls.push("open.gateway-subscribe");

		return { data: true, event: "reply" };
	}
}

@Controller("open-pattern")
class OpenPatternController {
	@EventPattern("open.event")
	public event(_data: unknown): void {
		patternHandlerCalls.push("open.event");
	}

	@MessagePattern("open.message")
	public message(): { isReached: boolean } {
		patternHandlerCalls.push("open.message");

		return { isReached: true };
	}
}

describe("Served routes of securable controllers (E2E)", () => {
	const applications: Array<INestApplication | INestMicroservice> = [];
	const clients: Array<ClientProxy> = [];

	/**
	 * Builds the testing module of the controllers with the authorization module.
	 * @param {Array<Type<unknown>>} controllers - Controllers to serve.
	 * @param {ReadonlyArray<Provider>} providers - Additional providers.
	 * @param {ReadonlyArray<DynamicModule | Type<unknown>>} imports - Additional imports.
	 * @param {ReadonlyArray<[unknown, unknown]>} overrides - Providers to replace with values.
	 * @returns {Promise<TestingModule>} The compiled module.
	 */
	async function compile(controllers: Array<Type<unknown>>, providers: ReadonlyArray<Provider> = [], imports: ReadonlyArray<DynamicModule | Type<unknown>> = [], overrides: ReadonlyArray<[unknown, unknown]> = []): Promise<TestingModule> {
		let builder: ReturnType<typeof Test.createTestingModule> = Test.createTestingModule({
			controllers,
			imports: [TypeOrmModule.forRoot({ database: ":memory:", dropSchema: true, entities: [SecurablePlainRouteItemEntity], logging: false, synchronize: true, type: "better-sqlite3" }), TypeOrmModule.forFeature([SecurablePlainRouteItemEntity]), ApiAuthorizationModule.forRoot(), ApiSubscriberModule, ...imports],
			providers: [SecurablePlainRouteItemService, SecurablePlainRouteItemPolicy, ...providers],
		});

		for (const [token, value] of overrides) {
			builder = builder.overrideProvider(token).useValue(value);
		}

		return await builder.compile();
	}

	/**
	 * Boots the controllers through the real bootstrap and opens a real socket.
	 * @param {Array<Type<unknown>>} controllers - Controllers to serve.
	 * @param {ReadonlyArray<Provider>} [providers] - Additional providers.
	 * @param {ReadonlyArray<DynamicModule | Type<unknown>>} [imports] - Additional imports.
	 * @returns {Promise<INestApplication>} The listening application.
	 */
	async function boot(controllers: Array<Type<unknown>>, providers: ReadonlyArray<Provider> = [], imports: ReadonlyArray<DynamicModule | Type<unknown>> = []): Promise<INestApplication> {
		const moduleReference: TestingModule = await compile(controllers, providers, imports);
		const application: INestApplication = moduleReference.createNestApplication(new FastifyAdapter(), { logger: false });

		applications.push(application);
		await application.listen(0, "127.0.0.1");

		return application;
	}

	/**
	 * Boots the controllers with the startup validation replaced, which leaves only what runs per request.
	 * @param {Array<Type<unknown>>} controllers - Controllers to serve.
	 * @param {ReadonlyArray<[unknown, unknown]>} [overrides] - More providers to replace with values.
	 * @param {ReadonlyArray<Provider>} [providers] - Additional providers.
	 * @returns {Promise<INestApplication>} The listening application.
	 */
	async function bootWithoutStartupValidation(controllers: Array<Type<unknown>>, overrides: ReadonlyArray<[unknown, unknown]> = [], providers: ReadonlyArray<Provider> = []): Promise<INestApplication> {
		const moduleReference: TestingModule = await compile(controllers, providers, [], [[ApiAuthorizationBootstrapValidationService, {}], ...overrides]);
		const application: INestApplication = moduleReference.createNestApplication(new FastifyAdapter(), { logger: false });

		applications.push(application);
		await application.listen(0, "127.0.0.1");

		return application;
	}

	/**
	 * Finds a free TCP port for a microservice.
	 * @returns {Promise<number>} The port.
	 */
	async function findFreePort(): Promise<number> {
		return await new Promise<number>((resolve: (port: number) => void, reject: (error: Error) => void): void => {
			const server: ReturnType<typeof createServer> = createServer();

			server.once("error", reject);
			server.listen(0, "127.0.0.1", (): void => {
				const { port }: AddressInfo = server.address() as AddressInfo;

				server.close((): void => {
					resolve(port);
				});
			});
		});
	}

	/**
	 * Boots a hybrid application: HTTP and a real TCP microservice in one application.
	 * @param {Array<Type<unknown>>} controllers - Controllers to serve.
	 * @param {ReadonlyArray<[unknown, unknown]>} [overrides] - Providers to replace with values.
	 * @returns {Promise<{ application: INestApplication; client: ClientProxy }>} The listening application and a connected TCP client.
	 */
	async function bootHybrid(controllers: Array<Type<unknown>>, overrides: ReadonlyArray<[unknown, unknown]> = []): Promise<{ application: INestApplication; client: ClientProxy }> {
		const port: number = await findFreePort();
		const moduleReference: TestingModule = await compile(controllers, [], [], overrides);
		const application: INestApplication = moduleReference.createNestApplication(new FastifyAdapter(), { logger: false });

		applications.push(application);
		application.connectMicroservice({ options: { host: "127.0.0.1", port }, transport: Transport.TCP });
		await application.startAllMicroservices();
		await application.listen(0, "127.0.0.1");

		const client: ClientProxy = ClientProxyFactory.create({ options: { host: "127.0.0.1", port }, transport: Transport.TCP });

		clients.push(client);
		await client.connect();

		return { application, client };
	}

	/**
	 * Sends a message and returns the reply or the error the transport carries back.
	 * @param {ClientProxy} client - Connected client.
	 * @param {string} pattern - Message pattern.
	 * @param {unknown} [payload] - Message payload.
	 * @returns {Promise<unknown>} The reply, or the error.
	 */
	async function sendMessage(client: ClientProxy, pattern: string, payload: unknown = {}): Promise<unknown> {
		return await firstValueFrom(client.send(pattern, payload).pipe(timeout(10_000))).catch((error: unknown): unknown => error);
	}

	/**
	 * Emits an event and gives the server time to run its handler.
	 * @param {ClientProxy} client - Connected client.
	 * @param {unknown} pattern - Event pattern.
	 * @param {unknown} [payload] - Event payload.
	 * @returns {Promise<void>} Resolves once the handler had its time.
	 */
	async function emitEvent(client: ClientProxy, pattern: unknown, payload: unknown = {}): Promise<void> {
		await firstValueFrom(client.emit(pattern, payload));
		await new Promise<void>((resolve: () => void): void => {
			setTimeout(resolve, 300);
		});
	}

	/**
	 * Sends one message over a real WebSocket connection and returns what the gateway answers.
	 * @param {INestApplication} application - Listening application.
	 * @param {string} message - Message name.
	 * @returns {Promise<{ exception?: unknown; reply?: unknown }>} The reply, or the exception.
	 */
	async function sendSocketMessage(application: INestApplication, message: string): Promise<{ exception?: unknown; reply?: unknown }> {
		const socket: Socket = io(await application.getUrl(), { transports: ["websocket"] });

		try {
			return await new Promise<{ exception?: unknown; reply?: unknown }>((resolve: (answer: { exception?: unknown; reply?: unknown }) => void, reject: (error: Error) => void): void => {
				socket.on("connect", (): void => {
					socket.emit(message, ATTACKER_PAYLOAD);
				});
				socket.on("connect_error", reject);
				socket.on("exception", (exception: unknown): void => {
					resolve({ exception });
				});
				socket.on("reply", (reply: unknown): void => {
					resolve({ reply });
				});
			});
		} finally {
			socket.close();
		}
	}

	/**
	 * Initializes the controllers in an application without `ApiAuthorizationModule`.
	 * @param {Array<Type<unknown>>} controllers - Controllers to serve.
	 * @returns {Promise<INestApplication>} The initialized application.
	 */
	async function initWithoutAuthorizationModule(controllers: Array<Type<unknown>>): Promise<INestApplication> {
		const moduleReference = await Test.createTestingModule({
			controllers,
			imports: [TypeOrmModule.forRoot({ database: ":memory:", dropSchema: true, entities: [SecurablePlainRouteItemEntity], logging: false, synchronize: true, type: "better-sqlite3" }), TypeOrmModule.forFeature([SecurablePlainRouteItemEntity]), ApiSubscriberModule],
			providers: [SecurablePlainRouteItemService],
		}).compile();
		const application: INestApplication = moduleReference.createNestApplication(new FastifyAdapter(), { logger: false });

		applications.push(application);
		await application.init();

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
		for (const client of clients.splice(0)) {
			await client.close();
		}

		for (const application of applications.splice(0)) {
			await application.close().catch((): void => undefined);
		}

		patternHandlerCalls.length = 0;
		vi.restoreAllMocks();
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

		it("does not accept an APP_GUARD in place of the guard on the route", async () => {
			await expect(boot([AppGuardOnlyController], [{ provide: APP_GUARD, useClass: ApiAuthorizationGuard }])).rejects.toThrow(plainRouteError("AppGuardOnlyController", "report", "GET /app-guard/report"));
		});

		it("does not accept another guard that has the same class name", async () => {
			await expect(boot([SameNameGuardController])).rejects.toThrow(plainRouteError("SameNameGuardController", "report", "GET /same-name-guard/report"));
		});

		it("does not accept an instance of the authorization guard", async () => {
			await expect(boot([GuardInstanceController])).rejects.toThrow(plainRouteError("GuardInstanceController", "report", "GET /guard-instance/report"));
		});

		it("names the RouterModule prefix of the path", async () => {
			await expect(boot([], [], [RouterPrefixedModule, RouterModule.register([{ module: RouterPrefixedModule, path: "admin" }])])).rejects.toThrow(plainRouteError("RouterPrefixedController", "report", "GET /admin/prefixed/report"));
		});

		it("names the versions of a route", async () => {
			await expect(boot([VersionedHandlerController])).rejects.toThrow(plainRouteError("VersionedHandlerController", "report", "GET /versioned-handler/report (version 2, 3)"));
		});

		it("names the version of the controller", async () => {
			await expect(boot([VersionedClassController])).rejects.toThrow(plainRouteError("VersionedClassController", "report", "GET /versioned-class/report (version 4)"));
		});

		it("leaves out a request method that the route does not declare", async () => {
			await expect(boot([HandWrittenPathController])).rejects.toThrow(plainRouteError("HandWrittenPathController", "report", "/hand-path/report"));
		});

		it("refuses hand-written route metadata that has no route", async () => {
			await expect(boot([MetadataWithoutRouteController])).rejects.toThrow(new Error(`[NestJS-Crud-Automator] Controller "MetadataWithoutRouteController" method "report" route metadata must declare route`));
		});
	});

	describe("a handler replaced on the instance keeps going through authorization", () => {
		it.each<[string, Type<unknown>, string, string, string]>([
			["an @ApiMethod route bound in the constructor", BoundApiMethodController, "BoundApiMethodController", "denied", "POST /bound-method/denied"],
			["an @ApiRouteCustom route bound in the constructor", BoundApiRouteCustomController, "BoundApiRouteCustomController", "denied", "POST /bound-custom/denied"],
			["a generated route bound in a base class constructor", BoundGeneratedDeleteController, "BoundGeneratedDeleteController", "delete", "DELETE /bound-delete/:id"],
			["a secured method of the parent hidden with defineProperty", DefinePropertyOverParentController, "DefinePropertyOverParentController", "publish", "POST /define-property/publish"],
			["a bound copy that carries the route metadata but not the guards", PartialCopyController, "PartialCopyController", "allowed", "POST /partial-copy/allowed"],
		])("refuses %s at startup", async (_case: string, controller: Type<unknown>, name: string, method: string, route: string) => {
			await expect(boot([controller])).rejects.toThrow(replacedHandlerError(name, method, route));
		});

		it("accepts a bound copy that carries all the metadata, and authorizes it", async () => {
			const application: INestApplication = await boot([FullCopyController]);

			expect((await request(application, "POST", "/full-copy/allowed")).status).toBe(HttpStatus.OK);
			expect((await request(application, "POST", "/full-copy/denied")).status).toBe(HttpStatus.FORBIDDEN);
		});

		it("denies a request-scoped handler bound in the constructor, which startup cannot see", async () => {
			const application: INestApplication = await boot([RequestScopedBoundController]);

			expect((await request(application, "POST", "/request-scoped-bound/denied")).status).toBe(HttpStatus.FORBIDDEN);
		});

		it("denies a request-scoped bound copy that carries the route metadata but not the guards", async () => {
			const application: INestApplication = await boot([RequestScopedPartialCopyController]);

			expect((await request(application, "POST", "/request-scoped-partial/allowed")).status).toBe(HttpStatus.FORBIDDEN);
		});

		it("denies a bound generated DELETE and keeps the row, also with startup validation replaced", async () => {
			const application: INestApplication = await bootWithoutStartupValidation([BoundGeneratedDeleteController]);
			const repository: Repository<SecurablePlainRouteItemEntity> = application.get(getRepositoryToken(SecurablePlainRouteItemEntity));

			await repository.save({ id: "row-1", name: "Name" });

			expect((await request(application, "DELETE", "/bound-delete/row-1")).status).toBe(HttpStatus.FORBIDDEN);
			await expect(repository.count()).resolves.toBe(1);
		});

		it("denies a route whose path metadata a hook removed after the routes were registered", async () => {
			const application: INestApplication = await boot([StrippedPathController], [StripPathOnModuleInit]);

			expect((await request(application, "GET", "/stripped-path/report")).status).toBe(HttpStatus.FORBIDDEN);
		});
	});

	describe("the class guard does not change a route that goes through authorization", () => {
		it("evaluates the policy once", async () => {
			const evaluate = vi.spyOn(ApiAuthorizationRuntime.prototype, "evaluate");
			const application: INestApplication = await boot([CountedPolicyController]);

			expect((await request(application, "POST", "/counted/counted")).status).toBe(HttpStatus.OK);
			expect(evaluate).toHaveBeenCalledOnce();
		});

		it("passes a subclass of the authorization guard", async () => {
			const application: INestApplication = await boot([SubclassedGuardAllowedController]);

			expect((await request(application, "GET", "/subclassed-guard-allowed/report")).status).toBe(HttpStatus.OK);
		});

		it("passes the authorization guard on the class", async () => {
			const application: INestApplication = await boot([ClassGuardAllowedController]);

			expect((await request(application, "GET", "/class-guard-allowed/report")).status).toBe(HttpStatus.OK);
		});
	});

	describe("a pattern handler counts as a served handler", () => {
		it("refuses @MessagePattern in a standalone microservice", async () => {
			const moduleReference: TestingModule = await compile([MessagePatternController]);
			const microservice: INestMicroservice = moduleReference.createNestMicroservice({ logger: false, options: { host: "127.0.0.1", port: await findFreePort() }, transport: Transport.TCP });

			applications.push(microservice);

			await expect(microservice.listen()).rejects.toThrow(patternHandlerError("MessagePatternController", "message", `"securable.message"`));
		});

		it("refuses a pattern handler in a standalone microservice without the module", async () => {
			const moduleReference: TestingModule = await Test.createTestingModule({
				controllers: [EventPatternController],
				imports: [TypeOrmModule.forRoot({ database: ":memory:", dropSchema: true, entities: [SecurablePlainRouteItemEntity], logging: false, synchronize: true, type: "better-sqlite3" }), TypeOrmModule.forFeature([SecurablePlainRouteItemEntity]), ApiSubscriberModule],
				providers: [SecurablePlainRouteItemService],
			}).compile();
			const microservice: INestMicroservice = moduleReference.createNestMicroservice({ logger: false, options: { host: "127.0.0.1", port: await findFreePort() }, transport: Transport.TCP });

			applications.push(microservice);

			await expect(microservice.listen()).rejects.toThrow(missingModuleError("EventPatternController"));
		});

		it("refuses @MessagePattern in a hybrid application", async () => {
			await expect(bootHybrid([MessagePatternController])).rejects.toThrow(patternHandlerError("MessagePatternController", "message", `"securable.message"`));
		});

		it("refuses @EventPattern in a hybrid application", async () => {
			await expect(bootHybrid([EventPatternController])).rejects.toThrow(patternHandlerError("EventPatternController", "event", `{"cmd":"securable.event"}`));
		});

		it("denies a message over TCP in a hybrid application, also with startup validation replaced", async () => {
			const { application, client } = await bootHybrid([MessagePatternController], [[ApiAuthorizationBootstrapValidationService, {}]]);

			await expect(sendMessage(client, "securable.message")).resolves.toMatchObject({ message: "Forbidden resource" });
			expect(patternHandlerCalls).toEqual([]);
			expect((await request(application, "POST", "/message-pattern/allowed")).status).toBe(HttpStatus.OK);
		});

		it("denies an event over TCP in a hybrid application, also with startup validation replaced", async () => {
			const { client } = await bootHybrid([EventPatternController], [[ApiAuthorizationBootstrapValidationService, {}]]);

			await emitEvent(client, { cmd: "securable.event" });

			expect(patternHandlerCalls).toEqual([]);
		});

		it("refuses @ApiMethod with @MessagePattern, because a message carries no identity to trust", async () => {
			await expect(bootHybrid([ApiMethodWithPatternController])).rejects.toThrow(patternHandlerError("ApiMethodWithPatternController", "admin", `"securable.admin"`));
		});

		it("refuses @ApiMethod with @EventPattern, because an event carries no identity to trust", async () => {
			await expect(bootHybrid([ApiMethodWithEventPatternController])).rejects.toThrow(patternHandlerError("ApiMethodWithEventPatternController", "admin", `"securable.admin-event"`));
		});

		it("does not take an identity from a message over TCP, with startup validation replaced", async () => {
			const evaluate = vi.spyOn(ApiAuthorizationRuntime.prototype, "evaluate");
			const { client } = await bootHybrid([ApiMethodWithPatternController], [[ApiAuthorizationBootstrapValidationService, {}]]);

			await expect(sendMessage(client, "securable.admin", ATTACKER_PAYLOAD)).resolves.toMatchObject({ message: "Forbidden resource" });
			await expect(sendMessage(client, "securable.allowed", ATTACKER_PAYLOAD)).resolves.toMatchObject({ message: "Forbidden resource" });

			expect(patternHandlerCalls).toEqual([]);
			expect(evaluate).not.toHaveBeenCalled();
		});

		it("does not take an identity from an event over TCP, with startup validation replaced", async () => {
			const { client } = await bootHybrid([ApiMethodWithEventPatternController], [[ApiAuthorizationBootstrapValidationService, {}]]);

			await emitEvent(client, "securable.admin-event", ATTACKER_PAYLOAD);

			expect(patternHandlerCalls).toEqual([]);
		});

		it("keeps the policy decision over HTTP for a handler that also has a pattern, with startup validation replaced", async () => {
			const { application } = await bootHybrid([ApiMethodWithPatternController], [[ApiAuthorizationBootstrapValidationService, {}]]);

			expect((await request(application, "POST", "/both-transports/admin")).status).toBe(HttpStatus.FORBIDDEN);
			expect(patternHandlerCalls).toEqual([]);

			expect((await request(application, "POST", "/both-transports/allowed")).status).toBe(HttpStatus.OK);
			expect(patternHandlerCalls).toEqual(["securable.allowed"]);
		});

		it("keeps pattern handlers on a controller that is not securable", async () => {
			const { client } = await bootHybrid([OpenPatternController]);

			await expect(sendMessage(client, "open.message")).resolves.toEqual({ isReached: true });
			await emitEvent(client, "open.event");

			expect(patternHandlerCalls).toEqual(["open.message", "open.event"]);
		});
	});

	describe("a WebSocket message follows the same rule", () => {
		it("refuses @SubscribeMessage on a securable controller", async () => {
			await expect(boot([SubscribeMessageController], [SubscribeMessageController])).rejects.toThrow(patternHandlerError("SubscribeMessageController", "subscribe", `"securable.controller-subscribe"`));
		});

		it("refuses @ApiMethod with @SubscribeMessage on a securable controller", async () => {
			await expect(boot([ApiMethodWithSubscribeMessageController])).rejects.toThrow(patternHandlerError("ApiMethodWithSubscribeMessageController", "admin", `"securable.api-method-subscribe"`));
		});

		it("denies a message of a securable controller, with startup validation replaced, and keeps its HTTP route", async () => {
			const application: INestApplication = await bootWithoutStartupValidation([SubscribeMessageController], [], [SubscribeMessageController]);

			await expect(sendSocketMessage(application, "securable.controller-subscribe")).resolves.toMatchObject({ exception: { message: "Forbidden resource" } });
			expect(patternHandlerCalls).toEqual([]);
			expect((await request(application, "POST", "/subscribe-message/allowed")).status).toBe(HttpStatus.OK);
		});

		it("denies a message of a securable gateway, which startup does not inspect", async () => {
			const application: INestApplication = await boot([], [SecurableGateway]);

			await expect(sendSocketMessage(application, "securable.gateway-subscribe")).resolves.toMatchObject({ exception: { message: "Forbidden resource" } });
			expect(patternHandlerCalls).toEqual([]);
		});

		it("does not take an identity from a message of a securable gateway with @ApiMethod", async () => {
			const evaluate = vi.spyOn(ApiAuthorizationRuntime.prototype, "evaluate");
			const application: INestApplication = await boot([], [SecurableApiMethodGateway]);

			await expect(sendSocketMessage(application, "securable.gateway-admin")).resolves.toMatchObject({ exception: { message: "Forbidden resource" } });
			expect(patternHandlerCalls).toEqual([]);
			expect(evaluate).not.toHaveBeenCalled();
		});

		it("keeps a gateway that is not securable", async () => {
			const application: INestApplication = await boot([], [OpenGateway]);

			await expect(sendSocketMessage(application, "open.gateway-subscribe")).resolves.toEqual({ reply: true });
			expect(patternHandlerCalls).toEqual(["open.gateway-subscribe"]);
		});
	});

	describe("a test harness that replaces the startup validation and the runtime", () => {
		it("serves a declared route with the stubbed runtime", async () => {
			const application: INestApplication = await bootWithoutStartupValidation(
				[DeclaredRoutesController],
				[
					[
						ApiAuthorizationRuntime,
						{
							evaluate: async (): Promise<IApiAuthorizationDecision<SecurablePlainRouteItemEntity>> => ({
								action: "test",
								appliedRules: [],
								effect: EApiPolicyEffect.ALLOW,
								mode: EApiAuthorizationMode.HOOKS,
								permissions: [],
								policyId: "test",
								policyIds: [],
								principal: { attributes: {}, id: "test", roles: [], type: EApiAuthorizationPrincipalType.USER },
								resourceType: "SecurablePlainRouteItemEntity",
								trace: { decisionType: EApiAuthorizationDecisionType.EXPLICIT_ALLOW, mode: EApiAuthorizationMode.HOOKS },
								transforms: [],
							}),
						},
					],
				],
			);

			expect((await request(application, "POST", "/declared/denied")).status).toBe(HttpStatus.OK);
		});

		it("turns off the check of plain routes, and the class guard still answers 403", async () => {
			const application: INestApplication = await bootWithoutStartupValidation([PlainGetController]);

			expect((await request(application, "GET", "/plain-get/report")).status).toBe(HttpStatus.FORBIDDEN);
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

	describe("a securable controller needs ApiAuthorizationModule", () => {
		it.each<[string, Type<unknown>, string]>([
			["a controller with only a plain @Get", PlainGetController, "PlainGetController"],
			["a bare @Controller", BareSecurableController, "BareSecurableController"],
			["@ApiControllerSecurable below @ApiController", SecurableBelowApiController, "SecurableBelowApiController"],
			["a child of a securable controller", SecurableInheritedController, "SecurableInheritedController"],
			["a request-scoped bare @Controller", RequestScopedBareController, "RequestScopedBareController"],
			["a request-scoped @ApiController", RequestScopedPlainController, "RequestScopedPlainController"],
		])("fails app.init() for %s without the module", async (_case: string, controller: Type<unknown>, name: string) => {
			await expect(initWithoutAuthorizationModule([controller])).rejects.toThrow(missingModuleError(name));
		});

		it("fails on the plain route when the module is there", async () => {
			await expect(boot([PlainGetController])).rejects.toThrow(plainRouteError("PlainGetController", "report", "GET /plain-get/report"));
		});

		it("validates a request-scoped controller when the module is there", async () => {
			await expect(boot([RequestScopedPlainController])).rejects.toThrow(plainRouteError("RequestScopedPlainController", "report", "GET /request-scoped-plain/report"));
		});

		it("authorizes a declared route of a request-scoped controller", async () => {
			const application: INestApplication = await boot([RequestScopedDeclaredController]);

			expect((await request(application, "POST", "/request-scoped-declared/denied")).status).toBe(HttpStatus.FORBIDDEN);
		});

		it("does not run the check on compile without init", async () => {
			const moduleReference = await Test.createTestingModule({ controllers: [BareSecurableController] }).compile();

			expect(moduleReference.get(BareSecurableController).report()).toEqual({ isReached: true });
			await moduleReference.close();
		});

		it("starts a non-securable controller without the module", async () => {
			const application: INestApplication = await initWithoutAuthorizationModule([NonSecurableGeneratedController, NonSecurableNestController]);

			await application.listen(0, "127.0.0.1");

			expect((await request(application, "GET", "/non-securable-generated/report")).status).toBe(HttpStatus.OK);
			expect((await request(application, "GET", "/non-securable-nest/report")).status).toBe(HttpStatus.OK);
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

		it.each<[string, Type<unknown>, string]>([
			["a securable child", SecuredChildWithDisabledRouteController, "/secured-child"],
			["a non-securable child", OpenChildWithDisabledRouteController, "/open-child"],
		])("answers 404 and leaves the route out of the OpenAPI document on %s", async (_case: string, controller: Type<unknown>, path: string) => {
			const application: INestApplication = await boot([controller]);
			const document: OpenAPIObject = SwaggerModule.createDocument(application, new DocumentBuilder().build());

			expect((await request(application, "GET", `${path}?limit=10&page=1`)).status).toBe(HttpStatus.NOT_FOUND);
			expect(document.paths[path]).toBeUndefined();
		});

		it("keeps the route in the OpenAPI document of the parent", async () => {
			const application: INestApplication = await boot([OpenGeneratedParentController]);
			const document: OpenAPIObject = SwaggerModule.createDocument(application, new DocumentBuilder().build());

			expect(document.paths["/open-parent"]?.get).toBeDefined();
		});

		it("keeps the generated handler callable from the child", async () => {
			const application: INestApplication = await boot([SecuredChildReusingDisabledRouteController]);
			const response: Response = await request(application, "POST", "/secured-child-reuse/summary");

			expect(response.status).toBe(HttpStatus.OK);
			await expect(response.json()).resolves.toEqual({ isHandlerKept: true });
			expect((await request(application, "GET", "/secured-child-reuse?limit=10&page=1")).status).toBe(HttpStatus.NOT_FOUND);
		});

		it("calls the generated handler from the child with its arguments and the controller as this", async () => {
			const application: INestApplication = await boot([SecuredChildCallingDisabledRouteController]);

			await application.get<Repository<SecurablePlainRouteItemEntity>>(getRepositoryToken(SecurablePlainRouteItemEntity)).save({ id: "row-1", name: "Name" });

			const response: Response = await request(application, "POST", "/secured-child-get/lookup");

			expect(response.status).toBe(HttpStatus.OK);
			await expect(response.json()).resolves.toMatchObject({ id: "row-1" });
			expect((await request(application, "GET", "/secured-child-get/row-1")).status).toBe(HttpStatus.NOT_FOUND);
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

		it("serves the parent routes under the own path of a subclass with @Controller", async () => {
			const application: INestApplication = await boot([OwnPathSubclassOfGeneratedController]);

			expect((await request(application, "GET", "/own-path?limit=10&page=1")).status).toBe(HttpStatus.OK);
			expect((await request(application, "GET", "/generated-parent?limit=10&page=1")).status).toBe(HttpStatus.NOT_FOUND);
		});

		it("keeps serving the route on the parent itself", async () => {
			const application: INestApplication = await boot([OpenGeneratedParentController]);

			expect((await request(application, "GET", "/open-parent?limit=10&page=1")).status).toBe(HttpStatus.OK);
		});
	});
});
