import { HttpStatus, Inject, Injectable, Param, RequestMethod } from "@nestjs/common";
import { ApiProperty } from "@nestjs/swagger";
import { InjectRepository } from "@nestjs/typeorm";
import { Column, Entity, PrimaryColumn, Repository } from "typeorm";

import type { IApiAuthorizationPolicySubscriberContext } from "../../../src/index";

import { ApiAuthorizationPolicy, ApiAuthorizationPolicyBase, ApiController, ApiControllerSecurable, ApiPropertyCopy, ApiPropertyDescribe, ApiRouteCustom, ApiService, ApiServiceBase, EApiAuthenticationType, EApiAuthorizationMode, EApiDtoType, EApiPolicyEffect, EApiPolicySourceType, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "../../../src/index";

export const E2E_PATH_PARAMETER_UUID_COPY_ALLOWED_ID: string = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
export const E2E_PATH_PARAMETER_UUID_COPY_DENIED_ID: string = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

// Every path value a handler of the UUID copy routes has read, in order.
export const E2E_PATH_PARAMETER_UUID_COPY_HANDLER_TRACE: Array<string> = [];

// Every path value the HOOKS policy of the UUID copy routes has seen, in order.
export const E2E_PATH_PARAMETER_UUID_COPY_POLICY_TRACE: Array<Record<string, string> | undefined> = [];

@Entity("e2e_path_parameter_uuid_copy_items")
export class E2ePathParameterUuidCopyItemEntity {
	@PrimaryColumn({ type: "uuid" })
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({ description: "label", exampleValue: "Label", format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING })
	public label!: string;
}

@Injectable()
@ApiService({ entity: E2ePathParameterUuidCopyItemEntity })
export class E2ePathParameterUuidCopyItemService extends ApiServiceBase<E2ePathParameterUuidCopyItemEntity> {
	@InjectRepository(E2ePathParameterUuidCopyItemEntity)
	public readonly repository!: Repository<E2ePathParameterUuidCopyItemEntity>;
}

/**
 * Denies the denied row by the path value text, as a HOOKS policy that compares `context.parameters` does, for the custom action and for a route of type `GET`.
 */
@Injectable()
@ApiAuthorizationPolicy({ entity: E2ePathParameterUuidCopyItemEntity })
export class E2ePathParameterUuidCopyPolicy extends ApiAuthorizationPolicyBase<E2ePathParameterUuidCopyItemEntity> {
	public getCustomActionRule(_action: string, context: IApiAuthorizationPolicySubscriberContext<E2ePathParameterUuidCopyItemEntity>): ReturnType<ApiAuthorizationPolicyBase<E2ePathParameterUuidCopyItemEntity>["allow"]> {
		return this.decide(context);
	}

	public onBeforeGet(context: IApiAuthorizationPolicySubscriberContext<E2ePathParameterUuidCopyItemEntity>): ReturnType<ApiAuthorizationPolicyBase<E2ePathParameterUuidCopyItemEntity>["allow"]> {
		return this.decide(context);
	}

	private decide(context: IApiAuthorizationPolicySubscriberContext<E2ePathParameterUuidCopyItemEntity>): ReturnType<ApiAuthorizationPolicyBase<E2ePathParameterUuidCopyItemEntity>["allow"]> {
		E2E_PATH_PARAMETER_UUID_COPY_POLICY_TRACE.push(context.parameters === undefined ? undefined : { ...context.parameters });

		return context.parameters?.id === E2E_PATH_PARAMETER_UUID_COPY_DENIED_ID ? [] : this.allow();
	}
}

/**
 * Authenticates every request as one principal, whose IAM document denies the denied row.
 */
@Injectable()
export class E2ePathParameterUuidCopyGuard {
	public canActivate(context: { switchToHttp: () => { getRequest: () => { user?: unknown } } }): boolean {
		context.switchToHttp().getRequest().user = { id: "path-parameter-uuid-copy", roles: [] };

		return true;
	}
}

export const E2E_PATH_PARAMETER_UUID_COPY_DOCUMENTS: Array<Record<string, unknown>> = [
	{
		document: {
			Statement: [
				{ Action: ["path-parameter-uuid-copy:*"], Effect: EApiPolicyEffect.ALLOW, Resource: ["*"] },
				{ Action: ["path-parameter-uuid-copy:*"], Effect: EApiPolicyEffect.DENY, Resource: [`path-parameter-uuid-copy/${E2E_PATH_PARAMETER_UUID_COPY_DENIED_ID}`] },
			],
			Version: "2012-10-17",
		},
		id: "path-parameter-uuid-copy",
		namespace: "path-parameter-uuid-copy",
		sourceType: EApiPolicySourceType.DATABASE,
		version: "1",
	},
];

// The path value copies the UUID column with the route and DTO type named.
export class E2ePathParameterUuidCopyExplicitDto {
	@ApiPropertyCopy({ dtoType: EApiDtoType.PARAMETERS, entity: (): typeof E2ePathParameterUuidCopyItemEntity => E2ePathParameterUuidCopyItemEntity, method: EApiRouteType.GET, propertyName: "id" })
	public id!: string;
}

// The path value copies the UUID column in the context of the custom route that serves the DTO.
export class E2ePathParameterUuidCopyAutoDto {
	@ApiPropertyCopy({ entity: (): typeof E2ePathParameterUuidCopyItemEntity => E2ePathParameterUuidCopyItemEntity, propertyName: "id", shouldAutoResolveContext: true })
	public id!: string;
}

class E2ePathParameterUuidCopyResponseDto {
	@ApiProperty()
	public id!: string;
}

const NO_GENERATED_ROUTES: never = Object.fromEntries([EApiRouteType.CREATE, EApiRouteType.DELETE, EApiRouteType.GET, EApiRouteType.GET_LIST, EApiRouteType.PARTIAL_UPDATE, EApiRouteType.UPDATE].map((routeType: EApiRouteType) => [routeType, { generation: { isEnabled: false } }])) as never;

const IAM_AUTHORIZATION: never = {
	defaultMode: EApiAuthorizationMode.IAM,
	policyNamespace: "path-parameter-uuid-copy",
	resourceDefinition: { entity: E2ePathParameterUuidCopyItemEntity, fields: [{ isFilterable: true, path: "resource.id", queryPath: "id" }], namespace: "path-parameter-uuid-copy", resourcePath: "path-parameter-uuid-copy/{id}", resourceType: "path-parameter-uuid-copy" },
} as never;

/**
 * Describes a custom `GET` route of the UUID copy controllers, with the custom action `policy`.
 * @param {string} path - Route path.
 * @param {new () => unknown} dto - PARAMETERS DTO.
 * @param {EApiRouteType} [routeType] - Route type, which gives a copy with `shouldAutoResolveContext` its route.
 * @returns {never} The `@ApiRouteCustom` properties.
 */
export function E2ePathParameterUuidCopyRoute(path: string, dto: new () => unknown, routeType?: EApiRouteType): never {
	return {
		documentation: { description: "Reads the policy of a row", summary: "Reads the policy of a row" },
		dto: { [EApiDtoType.PARAMETERS]: dto },
		resource: { action: "policy", entity: E2ePathParameterUuidCopyItemEntity },
		response: { errors: {}, serialization: { isEnabled: false }, status: HttpStatus.OK, type: E2ePathParameterUuidCopyResponseDto },
		route: { method: RequestMethod.GET, path, type: routeType },
		security: { authentication: { guard: E2ePathParameterUuidCopyGuard, type: EApiAuthenticationType.USER } },
	} as never;
}

/**
 * Makes a controller class a securable controller of the UUID copy rows.
 * @param {string} name - Unique controller name.
 * @param {string} segment - Last segment of the controller path.
 * @param {new () => unknown} controller - Controller class with its routes.
 * @param {EApiAuthorizationMode} [mode] - Authorization mode of the controller.
 * @returns {new () => unknown} The securable controller.
 */
export function E2ePathParameterUuidCopySecure(name: string, segment: string, controller: new () => unknown, mode: EApiAuthorizationMode = EApiAuthorizationMode.IAM): new () => unknown {
	Object.defineProperty(controller, "name", { value: name });
	ApiController<E2ePathParameterUuidCopyItemEntity>({ authorization: mode === EApiAuthorizationMode.HOOKS ? ({ defaultMode: EApiAuthorizationMode.HOOKS } as never) : IAM_AUTHORIZATION, entity: E2ePathParameterUuidCopyItemEntity, name, path: `path-parameter/uuid-copy/${segment}`, routes: NO_GENERATED_ROUTES })(controller as never);
	ApiControllerSecurable()(controller);

	return controller;
}

/**
 * Builds the controller that serves the UUID copy routes in one authorization mode.
 * @param {EApiAuthorizationMode} mode - Authorization mode of the controller.
 * @returns {new () => unknown} The controller.
 */
function buildServedController(mode: EApiAuthorizationMode): new () => unknown {
	class ServedController {
		@Inject(E2ePathParameterUuidCopyItemService)
		public readonly service!: E2ePathParameterUuidCopyItemService;

		@ApiRouteCustom(E2ePathParameterUuidCopyRoute("auto/:id/policy", E2ePathParameterUuidCopyAutoDto, EApiRouteType.GET))
		public async readAuto(@Param("id") id: string): Promise<Record<string, unknown>> {
			return await this.read(id);
		}

		@ApiRouteCustom(E2ePathParameterUuidCopyRoute("explicit/:id/policy", E2ePathParameterUuidCopyExplicitDto))
		public async readExplicit(@Param("id") id: string): Promise<Record<string, unknown>> {
			return await this.read(id);
		}

		private async read(id: string): Promise<Record<string, unknown>> {
			E2E_PATH_PARAMETER_UUID_COPY_HANDLER_TRACE.push(id);
			const row: E2ePathParameterUuidCopyItemEntity | null = await this.service.repository.findOneBy({ id });

			return { id, label: row?.label };
		}
	}

	return mode === EApiAuthorizationMode.HOOKS ? E2ePathParameterUuidCopySecure("E2ePathParameterUuidCopyHooks", "hooks", ServedController, mode) : E2ePathParameterUuidCopySecure("E2ePathParameterUuidCopyServed", "served", ServedController);
}

export const E2ePathParameterUuidCopyController: new () => unknown = buildServedController(EApiAuthorizationMode.IAM);
export const E2ePathParameterUuidCopyHooksController: new () => unknown = buildServedController(EApiAuthorizationMode.HOOKS);

/**
 * Builds a controller whose PARAMETERS DTO copies the UUID column with `shouldAutoResolveContext` on a custom route without a route type, so no route gives the copy its context.
 * @returns {new () => unknown} The controller.
 */
export function E2ePathParameterUuidCopyBuildUnresolvedController(): new () => unknown {
	class UnresolvedDto {
		@ApiPropertyCopy({ entity: (): typeof E2ePathParameterUuidCopyItemEntity => E2ePathParameterUuidCopyItemEntity, propertyName: "id", shouldAutoResolveContext: true })
		public id!: string;
	}

	class UnresolvedController {
		@ApiRouteCustom(E2ePathParameterUuidCopyRoute(":id/policy", UnresolvedDto))
		public read(@Param("id") id: string): Record<string, unknown> {
			E2E_PATH_PARAMETER_UUID_COPY_HANDLER_TRACE.push(id);

			return { id };
		}
	}

	return E2ePathParameterUuidCopySecure("E2ePathParameterUuidCopyUnresolved", "unresolved", UnresolvedController);
}

/**
 * Declares a controller that serves one PARAMETERS DTO, whose copy has `shouldAutoResolveContext`, on custom routes of two route types, so the copy cannot follow both.
 * @returns {new () => unknown} The controller, which is never returned: declaring it throws.
 */
export function E2ePathParameterUuidCopyBuildSharedController(): new () => unknown {
	class SharedDto {
		@ApiPropertyCopy({ entity: (): typeof E2ePathParameterUuidCopyItemEntity => E2ePathParameterUuidCopyItemEntity, propertyName: "id", shouldAutoResolveContext: true })
		public id!: string;
	}

	class SharedController {
		@ApiRouteCustom(E2ePathParameterUuidCopyRoute(":id/policy", SharedDto, EApiRouteType.GET))
		public read(@Param("id") id: string): string {
			return id;
		}

		@ApiRouteCustom(E2ePathParameterUuidCopyRoute(":id/removal", SharedDto, EApiRouteType.DELETE))
		public remove(@Param("id") id: string): string {
			return id;
		}
	}

	return E2ePathParameterUuidCopySecure("E2ePathParameterUuidCopyShared", "shared", SharedController);
}
