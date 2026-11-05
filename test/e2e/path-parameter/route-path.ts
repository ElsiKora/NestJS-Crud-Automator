import type { PipeTransform } from "@nestjs/common";

import type { IApiAuthorizationPolicySubscriberContext } from "../../../src/index";

import { HttpStatus, Inject, Injectable, Module, Param, ParseIntPipe, RequestMethod, UsePipes, ValidationPipe } from "@nestjs/common";
import { ApiProperty } from "@nestjs/swagger";
import { InjectRepository, TypeOrmModule } from "@nestjs/typeorm";
import { Type } from "class-transformer";
import { IsInt } from "class-validator";
import { Column, Entity, PrimaryColumn, Repository } from "typeorm";

import { ApiAuthorizationPolicy, ApiAuthorizationPolicyBase, ApiController, ApiControllerSecurable, ApiPropertyCopy, ApiPropertyDescribe, ApiRouteCustom, ApiService, ApiServiceBase, EApiAuthenticationType, EApiAuthorizationMode, EApiDtoType, EApiPolicyEffect, EApiPolicySourceType, EApiPropertyDescribeType, EApiPropertyNumberType, EApiPropertyStringType, EApiRouteType } from "../../../src/index";

export const E2E_ROUTE_PATH_DENIED_TENANT: number = 16;
export const E2E_ROUTE_PATH_ALLOWED_TENANT: number = 1;
export const E2E_ROUTE_PATH_UNIT: number = 2;
export const E2E_ROUTE_PATH_ITEM: number = 1;

// Every path value a HOOKS policy of these routes has seen, in order.
export const E2E_ROUTE_PATH_POLICY_TRACE: Array<Record<string, string> | undefined> = [];

@Entity("e2e_path_parameter_route_path_items")
export class E2eRoutePathItemEntity {
	@PrimaryColumn({ type: "int" })
	@ApiPropertyDescribe({ description: "id", exampleValue: 1, format: EApiPropertyNumberType.INTEGER, maximum: 2_147_483_647, minimum: 1, multipleOf: 1, type: EApiPropertyDescribeType.NUMBER })
	public id!: number;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({ description: "label", exampleValue: "Label", format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING })
	public label!: string;

	@Column({ type: "int" })
	@ApiPropertyDescribe({ description: "tenant", exampleValue: 1, format: EApiPropertyNumberType.INTEGER, maximum: 2_147_483_647, minimum: 1, multipleOf: 1, type: EApiPropertyDescribeType.NUMBER })
	public tenant!: number;

	@Column({ type: "int" })
	@ApiPropertyDescribe({ description: "unit", exampleValue: 1, format: EApiPropertyNumberType.INTEGER, maximum: 2_147_483_647, minimum: 1, multipleOf: 1, type: EApiPropertyDescribeType.NUMBER })
	public unit!: number;
}

@Injectable()
@ApiService({ entity: E2eRoutePathItemEntity })
export class E2eRoutePathItemService extends ApiServiceBase<E2eRoutePathItemEntity> {
	@InjectRepository(E2eRoutePathItemEntity)
	public readonly repository!: Repository<E2eRoutePathItemEntity>;
}

/**
 * Denies the tenant or organization 16 by the path value text, as a HOOKS policy that compares `context.parameters` does.
 */
@Injectable()
@ApiAuthorizationPolicy({ entity: E2eRoutePathItemEntity })
export class E2eRoutePathPolicy extends ApiAuthorizationPolicyBase<E2eRoutePathItemEntity> {
	public getCustomActionRule(_action: string, context: IApiAuthorizationPolicySubscriberContext<E2eRoutePathItemEntity>): ReturnType<ApiAuthorizationPolicyBase<E2eRoutePathItemEntity>["allow"]> {
		E2E_ROUTE_PATH_POLICY_TRACE.push(context.parameters === undefined ? undefined : { ...context.parameters });
		const denied: string = String(E2E_ROUTE_PATH_DENIED_TENANT);

		return context.parameters?.tenant === denied || context.parameters?.org === denied ? [] : this.allow();
	}
}

/**
 * Authenticates every request as one principal, whose IAM document denies the tenant or organization 16.
 */
@Injectable()
export class E2eRoutePathGuard {
	public canActivate(context: { switchToHttp: () => { getRequest: () => { user?: unknown } } }): boolean {
		context.switchToHttp().getRequest().user = { id: "route-path", roles: [] };

		return true;
	}
}

/**
 * Authenticates like {@link E2eRoutePathGuard} and adds a path parameter startup never saw, as a router that names a value startup could not read would.
 */
@Injectable()
export class E2eRoutePathInjectingGuard {
	public canActivate(context: { switchToHttp: () => { getRequest: () => { params: Record<string, string>; user?: unknown } } }): boolean {
		const request: { params: Record<string, string>; user?: unknown } = context.switchToHttp().getRequest();
		request.user = { id: "route-path", roles: [] };
		request.params.extra = "016";

		return true;
	}
}

const DENIED_RESOURCES: Array<string> = [`route-path/t${String(E2E_ROUTE_PATH_DENIED_TENANT)}/${String(E2E_ROUTE_PATH_ITEM)}`, `route-path/t${String(E2E_ROUTE_PATH_DENIED_TENANT)}/u${String(E2E_ROUTE_PATH_UNIT)}/${String(E2E_ROUTE_PATH_ITEM)}`, `route-path/o${String(E2E_ROUTE_PATH_DENIED_TENANT)}/${String(E2E_ROUTE_PATH_ITEM)}`];

export const E2E_ROUTE_PATH_DOCUMENTS: Array<Record<string, unknown>> = [
	{
		document: {
			Statement: [
				{ Action: ["route-path:*"], Effect: EApiPolicyEffect.ALLOW, Resource: ["*"] },
				{ Action: ["route-path:*"], Effect: EApiPolicyEffect.DENY, Resource: DENIED_RESOURCES },
			],
			Version: "2012-10-17",
		},
		id: "route-path",
		namespace: "route-path",
		sourceType: EApiPolicySourceType.DATABASE,
		version: "1",
	},
];

/**
 * Copies one integer column of the item entity onto a PARAMETERS DTO property.
 * @param {"id" | "tenant" | "unit"} propertyName - Entity column.
 * @returns {PropertyDecorator} The `ApiPropertyCopy` decorator.
 */
function copy(propertyName: "id" | "tenant" | "unit"): PropertyDecorator {
	return ApiPropertyCopy({ dtoType: EApiDtoType.PARAMETERS, entity: (): typeof E2eRoutePathItemEntity => E2eRoutePathItemEntity, method: EApiRouteType.GET, propertyName }) as PropertyDecorator;
}

export class E2eRoutePathIdDto {
	@copy("id")
	public id!: number;
}

// Holds the item under the path parameter "itemId", a name the IAM resource path does not use.
export class E2eRoutePathItemIdDto {
	@copy("id")
	public itemId!: number;
}

export class E2eRoutePathTenantDto {
	@copy("id")
	public id!: number;

	@copy("tenant")
	public tenant!: number;
}

export class E2eRoutePathUnitDto {
	@copy("id")
	public id!: number;

	@copy("tenant")
	public tenant!: number;

	@copy("unit")
	public unit!: number;
}

export class E2eRoutePathOrgDto {
	@copy("id")
	public id!: number;

	@copy("tenant")
	public org!: number;
}

// A bare validator keeps the text as sent, so a HOOKS policy could compare 016 where it denies 16.
export class E2eRoutePathValidatorDto {
	@IsInt()
	@Type(() => Number)
	public id!: number;
}

class E2eRoutePathResponseDto {
	@ApiProperty()
	public value!: string;
}

const NO_GENERATED_ROUTES: never = Object.fromEntries([EApiRouteType.CREATE, EApiRouteType.DELETE, EApiRouteType.GET, EApiRouteType.GET_LIST, EApiRouteType.PARTIAL_UPDATE, EApiRouteType.UPDATE].map((routeType: EApiRouteType) => [routeType, { generation: { isEnabled: false } }])) as never;

/**
 * Builds the authorization block of a controller.
 * @param {EApiAuthorizationMode} mode - Authorization mode.
 * @param {string} resourcePath - IAM resource path.
 * @returns {never} The authorization block.
 */
function authorization(mode: EApiAuthorizationMode, resourcePath: string): never {
	return (
		mode === EApiAuthorizationMode.IAM
			? {
					defaultMode: mode,
					policyNamespace: "route-path",
					resourceDefinition: {
						entity: E2eRoutePathItemEntity,
						fields: [
							{ isFilterable: true, path: "resource.id", queryPath: "id" },
							{ isFilterable: true, path: "resource.org", queryPath: "tenant" },
						],
						namespace: "route-path",
						resourcePath,
						resourceType: "route-path",
					},
				}
			: { defaultMode: mode }
	) as never;
}

/**
 * Describes a custom `GET` route.
 * @param {string} path - Route path.
 * @param {EApiAuthorizationMode} mode - Authorization mode.
 * @param {new () => unknown} dto - PARAMETERS DTO.
 * @param {new () => unknown} [guard] - Authentication guard.
 * @param {string} [action] - Route action.
 * @returns {never} The `@ApiRouteCustom` properties.
 */
function customRoute(path: string, mode: EApiAuthorizationMode, dto: new () => unknown, guard: new () => unknown = E2eRoutePathGuard, action: string = "read"): never {
	return {
		documentation: { description: "Reads an item", summary: "Reads an item" },
		dto: { [EApiDtoType.PARAMETERS]: dto },
		resource: { action, entity: E2eRoutePathItemEntity },
		response: { errors: {}, serialization: { isEnabled: false }, status: HttpStatus.OK, type: E2eRoutePathResponseDto },
		route: { method: RequestMethod.GET, path },
		security: { authentication: { guard, type: EApiAuthenticationType.USER }, authorization: { mode } },
	} as never;
}

/**
 * Makes a controller securable under a unique name.
 * @param {object} options - Controller options.
 * @param {new () => unknown} options.controller - Controller class.
 * @param {EApiAuthorizationMode} options.mode - Authorization mode.
 * @param {string} options.name - Unique controller name.
 * @param {string} options.path - Controller path.
 * @param {string} [options.resourcePath] - IAM resource path.
 * @param {never} [options.routes] - Generated route configuration.
 * @returns {new () => unknown} The securable controller.
 */
export function E2eRoutePathSecure(options: { controller: new () => unknown; mode: EApiAuthorizationMode; name: string; path: string; resourcePath?: string; routes?: never }): new () => unknown {
	Object.defineProperty(options.controller, "name", { value: options.name });
	ApiController<E2eRoutePathItemEntity>({ authorization: authorization(options.mode, options.resourcePath ?? "route-path/{id}"), entity: E2eRoutePathItemEntity, name: options.name, path: options.path, routes: options.routes ?? NO_GENERATED_ROUTES })(options.controller as never);
	ApiControllerSecurable()(options.controller);

	return options.controller;
}

/**
 * Builds a controller with one custom route that reads its path values and the row they name.
 * @param {object} options - Route options.
 * @param {new () => unknown} options.dto - PARAMETERS DTO.
 * @param {new () => unknown} [options.guard] - Authentication guard.
 * @param {EApiAuthorizationMode} options.mode - Authorization mode.
 * @param {string} options.name - Unique controller name.
 * @param {string} [options.path] - Controller path.
 * @param {string} [options.resourcePath] - IAM resource path.
 * @param {string} [options.routePath] - Route path.
 * @returns {new () => unknown} The securable controller.
 */
export function E2eRoutePathBuildController(options: { dto: new () => unknown; guard?: new () => unknown; mode: EApiAuthorizationMode; name: string; path?: string; resourcePath?: string; routePath?: string }): new () => unknown {
	class RoutePathController {
		@Inject(E2eRoutePathItemService)
		public readonly service!: E2eRoutePathItemService;

		@ApiRouteCustom(customRoute(options.routePath ?? "items/:id", options.mode, options.dto, options.guard))
		public async read(@Param() parameters: Record<string, string>): Promise<Record<string, unknown>> {
			const row: E2eRoutePathItemEntity | null = await this.service.repository.findOneBy({ id: Number(parameters.id) });

			return { label: row?.label, parameters: { ...parameters } };
		}
	}

	return E2eRoutePathSecure({ controller: RoutePathController, mode: options.mode, name: options.name, path: options.path ?? "", resourcePath: options.resourcePath });
}

/**
 * Wraps controllers in a module of their own, which a `RouterModule` path can mount.
 * @param {string} name - Unique module name.
 * @param {Array<new () => unknown>} controllers - Controllers of the module.
 * @returns {new () => unknown} The module class.
 */
export function E2eRoutePathBuildModule(name: string, controllers: Array<new () => unknown>): new () => unknown {
	@Module({ controllers, imports: [TypeOrmModule.forFeature([E2eRoutePathItemEntity])], providers: [E2eRoutePathItemService, E2eRoutePathGuard, E2eRoutePathInjectingGuard] })
	class RoutePathModule {}

	Object.defineProperty(RoutePathModule, "name", { value: name });

	return RoutePathModule;
}

/**
 * A pipe that turns any value into a number, as `ParseIntPipe` does, under another name.
 */
class E2eRoutePathNumberPipe implements PipeTransform {
	public transform(value: unknown): unknown {
		return typeof value === "string" ? Number(value) : value;
	}
}

/**
 * Builds a controller whose one route runs the given pipes from `@UsePipes`, on the method or on the controller.
 * @param {EApiAuthorizationMode} mode - Authorization mode.
 * @param {string} name - Unique controller name.
 * @param {"controller" | "method"} place - Where `@UsePipes` sits.
 * @param {Array<PipeTransform | (new () => PipeTransform)>} pipes - The pipes.
 * @returns {new () => unknown} The securable controller.
 */
export function E2eRoutePathBuildPipesController(mode: EApiAuthorizationMode, name: string, place: "controller" | "method", pipes: Array<PipeTransform | (new () => PipeTransform)>): new () => unknown {
	class PipesController {
		@ApiRouteCustom(customRoute("items/:id", mode, E2eRoutePathIdDto))
		public read(@Param() parameters: E2eRoutePathIdDto): E2eRoutePathIdDto {
			return parameters;
		}
	}

	if (place === "method") {
		UsePipes(...pipes)(PipesController.prototype, "read", Object.getOwnPropertyDescriptor(PipesController.prototype, "read") as PropertyDescriptor);
	} else {
		UsePipes(...pipes)(PipesController);
	}

	return E2eRoutePathSecure({ controller: PipesController, mode, name, path: `route-path/pipes/${name}` });
}

export const E2E_ROUTE_PATH_PIPES: Record<string, Array<PipeTransform | (new () => PipeTransform)>> = {
	"a ParseIntPipe class": [ParseIntPipe],
	"a ValidationPipe class": [ValidationPipe],
	"a ValidationPipe instance": [new ValidationPipe({ transform: true })],
	"an own pipe instance": [new E2eRoutePathNumberPipe()],
};

/**
 * Builds a controller whose list route reads the tenant of its `RouterModule` path through `ParseIntPipe`.
 * @param {EApiAuthorizationMode} mode - Authorization mode.
 * @param {string} name - Unique controller name.
 * @returns {new () => unknown} The securable controller.
 */
export function E2eRoutePathBuildTenantPipeController(mode: EApiAuthorizationMode, name: string): new () => unknown {
	class TenantPipeController {
		@ApiRouteCustom(customRoute("list/all", mode, E2eRoutePathTenantDto))
		public list(@Param("tenant", ParseIntPipe) tenant: number): number {
			return tenant;
		}
	}

	return E2eRoutePathSecure({ controller: TenantPipeController, mode, name, path: "" });
}

/**
 * Builds a controller that serves generated routes, the GET route unless others are named.
 * @param {EApiAuthorizationMode} mode - Authorization mode.
 * @param {string} name - Unique controller name.
 * @param {Array<EApiRouteType>} [routeTypes] - Generated routes to serve.
 * @param {string} [resourcePath] - IAM resource path.
 * @returns {new () => unknown} The securable controller.
 */
export function E2eRoutePathBuildGeneratedController(mode: EApiAuthorizationMode, name: string, routeTypes: Array<EApiRouteType> = [EApiRouteType.GET], resourcePath?: string): new () => unknown {
	class GeneratedController {
		@Inject(E2eRoutePathItemService)
		public readonly service!: E2eRoutePathItemService;
	}

	const routes: Record<string, unknown> = { ...(NO_GENERATED_ROUTES as Record<string, unknown>), ...Object.fromEntries(routeTypes.map((routeType: EApiRouteType): [EApiRouteType, unknown] => [routeType, { security: { authentication: { guard: E2eRoutePathGuard, type: EApiAuthenticationType.USER } } }])) };

	return E2eRoutePathSecure({ controller: GeneratedController, mode, name, path: resourcePath === undefined ? "items" : `route-path/${name}`, resourcePath, routes: routes as never });
}

/**
 * Builds an IAM controller whose custom POST route creates an item under a resource path whose placeholder its path does not carry, because a create names no row yet.
 * @param {string} name - Unique controller name.
 * @param {"action" | "type"} declaredBy - Whether the route declares `route.type` CREATE under another action, or only the action `create`.
 * @returns {new () => unknown} The securable controller.
 */
export function E2eRoutePathBuildCreateController(name: string, declaredBy: "action" | "type"): new () => unknown {
	class CreateController {
		@ApiRouteCustom({
			documentation: { description: "Creates an item", summary: "Creates an item" },
			dto: {},
			resource: { action: declaredBy === "type" ? "provision" : "create", entity: E2eRoutePathItemEntity },
			response: { errors: {}, serialization: { isEnabled: false }, status: HttpStatus.OK, type: E2eRoutePathResponseDto },
			route: { method: RequestMethod.POST, path: "", ...(declaredBy === "type" ? { type: EApiRouteType.CREATE } : {}) },
			security: { authentication: { guard: E2eRoutePathGuard, type: EApiAuthenticationType.USER }, authorization: { mode: EApiAuthorizationMode.IAM } },
		} as never)
		public create(): E2eRoutePathResponseDto {
			return { value: "created" };
		}
	}

	return E2eRoutePathSecure({ controller: CreateController, mode: EApiAuthorizationMode.IAM, name, path: `route-path/${name}`, resourcePath: "route-path/{id}" });
}

/**
 * Builds an IAM controller whose route lists items with the `list` action and carries no path parameter, under a resource path with placeholders a list maps to rows.
 * @param {string} name - Unique controller name.
 * @returns {new () => unknown} The securable controller.
 */
export function E2eRoutePathBuildListController(name: string): new () => unknown {
	class ListController {
		@ApiRouteCustom(customRoute("list/all", EApiAuthorizationMode.IAM, E2eRoutePathIdDto, E2eRoutePathGuard, "list"))
		public list(): Record<string, unknown> {
			return { label: "listed" };
		}
	}

	return E2eRoutePathSecure({ controller: ListController, mode: EApiAuthorizationMode.IAM, name, path: `route-path/${name}`, resourcePath: "route-path/t{tenant}/{id}" });
}
