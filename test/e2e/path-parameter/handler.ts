import type { IApiAuthorizationPolicySubscriberContext } from "../../../src/index";

import { HttpStatus, Inject, Injectable, Param, ParseIntPipe, RequestMethod } from "@nestjs/common";
import { ApiProperty } from "@nestjs/swagger";
import { InjectRepository } from "@nestjs/typeorm";
import { IsString } from "class-validator";
import { Column, Entity, PrimaryColumn, Repository } from "typeorm";

import { ApiAuthorizationPolicy, ApiAuthorizationPolicyBase, ApiController, ApiControllerSecurable, ApiMethod, ApiPropertyCopy, ApiPropertyDescribe, ApiRouteCustom, ApiService, ApiServiceBase, EApiAuthenticationType, EApiAuthorizationMode, EApiDtoType, EApiPolicyEffect, EApiPolicySourceType, EApiPropertyDescribeType, EApiPropertyNumberType, EApiPropertyStringType, EApiRouteType } from "../../../src/index";

export const E2E_PATH_PARAMETER_HANDLER_DENIED_ID: number = 16;
export const E2E_PATH_PARAMETER_HANDLER_ALLOWED_ID: number = 1;
export const E2E_PATH_PARAMETER_HANDLER_DENIED_CODE: string = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
export const E2E_PATH_PARAMETER_HANDLER_ALLOWED_CODE: string = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

// Every path value a HOOKS policy of the handler routes has seen, in order.
export const E2E_PATH_PARAMETER_HANDLER_POLICY_TRACE: Array<Record<string, string> | undefined> = [];

@Entity("e2e_path_parameter_handler_items")
export class E2ePathParameterHandlerItemEntity {
	@Column({ type: "uuid", unique: true })
	@ApiPropertyDescribe({ description: "code", type: EApiPropertyDescribeType.UUID })
	public code!: string;

	@PrimaryColumn({ type: "int" })
	@ApiPropertyDescribe({ description: "id", exampleValue: 1, format: EApiPropertyNumberType.INTEGER, maximum: 2_147_483_647, minimum: 1, multipleOf: 1, type: EApiPropertyDescribeType.NUMBER })
	public id!: number;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({ description: "label", exampleValue: "Label", format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING })
	public label!: string;
}

@Injectable()
@ApiService({ entity: E2ePathParameterHandlerItemEntity })
export class E2ePathParameterHandlerItemService extends ApiServiceBase<E2ePathParameterHandlerItemEntity> {
	@InjectRepository(E2ePathParameterHandlerItemEntity)
	public readonly repository!: Repository<E2ePathParameterHandlerItemEntity>;
}

/**
 * Denies the row 16 and the denied code by the path value text, as a HOOKS policy that compares `context.parameters` does.
 */
@Injectable()
@ApiAuthorizationPolicy({ entity: E2ePathParameterHandlerItemEntity })
export class E2ePathParameterHandlerPolicy extends ApiAuthorizationPolicyBase<E2ePathParameterHandlerItemEntity> {
	public getCustomActionRule(_action: string, context: IApiAuthorizationPolicySubscriberContext<E2ePathParameterHandlerItemEntity>): ReturnType<ApiAuthorizationPolicyBase<E2ePathParameterHandlerItemEntity>["allow"]> {
		E2E_PATH_PARAMETER_HANDLER_POLICY_TRACE.push(context.parameters === undefined ? undefined : { ...context.parameters });

		return context.parameters?.id === String(E2E_PATH_PARAMETER_HANDLER_DENIED_ID) || context.parameters?.code === E2E_PATH_PARAMETER_HANDLER_DENIED_CODE ? [] : this.allow();
	}
}

/**
 * Authenticates every request as one principal, whose IAM document denies the row 16.
 */
@Injectable()
export class E2ePathParameterHandlerGuard {
	public canActivate(context: { switchToHttp: () => { getRequest: () => { user?: unknown } } }): boolean {
		context.switchToHttp().getRequest().user = { id: "path-parameter-handler", roles: [] };

		return true;
	}
}

export const E2E_PATH_PARAMETER_HANDLER_DOCUMENTS: Array<Record<string, unknown>> = [
	{
		document: {
			Statement: [
				{ Action: ["path-parameter-handler:*"], Effect: EApiPolicyEffect.ALLOW, Resource: ["*"] },
				{ Action: ["path-parameter-handler:*"], Effect: EApiPolicyEffect.DENY, Resource: [`path-parameter-handler/${String(E2E_PATH_PARAMETER_HANDLER_DENIED_ID)}`] },
			],
			Version: "2012-10-17",
		},
		id: "path-parameter-handler",
		namespace: "path-parameter-handler",
		sourceType: EApiPolicySourceType.DATABASE,
		version: "1",
	},
];

export class E2ePathParameterHandlerIdDto {
	@ApiPropertyCopy({ dtoType: EApiDtoType.PARAMETERS, entity: (): typeof E2ePathParameterHandlerItemEntity => E2ePathParameterHandlerItemEntity, method: EApiRouteType.GET, propertyName: "id" })
	public id!: number;
}

export class E2ePathParameterHandlerCodeDto {
	@ApiPropertyCopy({ dtoType: EApiDtoType.PARAMETERS, entity: (): typeof E2ePathParameterHandlerItemEntity => E2ePathParameterHandlerItemEntity, method: EApiRouteType.GET, propertyName: "code" })
	public code!: string;
}

class E2ePathParameterHandlerOtherDto {
	@IsString()
	public id!: string;
}

class E2ePathParameterHandlerResponseDto {
	@ApiProperty()
	public value!: string;
}

const NO_GENERATED_ROUTES: never = Object.fromEntries([EApiRouteType.CREATE, EApiRouteType.DELETE, EApiRouteType.GET, EApiRouteType.GET_LIST, EApiRouteType.PARTIAL_UPDATE, EApiRouteType.UPDATE].map((routeType: EApiRouteType) => [routeType, { generation: { isEnabled: false } }])) as never;

const IAM_AUTHORIZATION: never = {
	defaultMode: EApiAuthorizationMode.IAM,
	policyNamespace: "path-parameter-handler",
	resourceDefinition: { entity: E2ePathParameterHandlerItemEntity, fields: [{ isFilterable: true, path: "resource.id", queryPath: "id" }], namespace: "path-parameter-handler", resourcePath: "path-parameter-handler/{id}", resourceType: "path-parameter-handler" },
} as never;

const HOOKS_AUTHORIZATION: never = { defaultMode: EApiAuthorizationMode.HOOKS } as never;

/**
 * Describes a custom `GET` route of the handler controllers.
 * @param {string} path - Route path.
 * @param {EApiAuthorizationMode} mode - Authorization mode of the route.
 * @param {new () => unknown} [dto] - PARAMETERS DTO, when the route declares one.
 * @returns {never} The `@ApiRouteCustom` properties.
 */
function customRoute(path: string, mode: EApiAuthorizationMode, dto?: new () => unknown): never {
	return {
		documentation: { description: "Reads a path value", summary: "Reads a path value" },
		dto: dto ? { [EApiDtoType.PARAMETERS]: dto } : {},
		resource: { action: "read", entity: E2ePathParameterHandlerItemEntity },
		response: { errors: {}, serialization: { isEnabled: false }, status: HttpStatus.OK, type: E2ePathParameterHandlerResponseDto },
		route: { method: RequestMethod.GET, path },
		security: { authentication: { guard: E2ePathParameterHandlerGuard, type: EApiAuthenticationType.USER }, authorization: { mode } },
	} as never;
}

/**
 * Builds the controller that serves the handler routes in one authorization mode.
 * @param {EApiAuthorizationMode} mode - Authorization mode of the controller and its routes.
 * @returns {new () => unknown} Controller class.
 */
function buildServedController(mode: EApiAuthorizationMode): new () => unknown {
	const segment: string = mode === EApiAuthorizationMode.IAM ? "iam" : "hooks";

	class ServedController {
		@Inject(E2ePathParameterHandlerItemService)
		public readonly service!: E2ePathParameterHandlerItemService;

		@ApiRouteCustom(customRoute("code/:code", mode, E2ePathParameterHandlerCodeDto))
		public async readCode(@Param("code") code: string): Promise<Record<string, unknown>> {
			const row: E2ePathParameterHandlerItemEntity | null = await this.service.repository.findOneBy({ code });

			return { code, label: row?.label };
		}

		@ApiRouteCustom(customRoute(":id", mode, E2ePathParameterHandlerIdDto))
		public async readId(@Param("id") id: string): Promise<Record<string, unknown>> {
			const row: E2ePathParameterHandlerItemEntity | null = await this.service.repository.findOneBy({ id: Number(id) });

			return { id, label: row?.label, type: typeof id };
		}

		@ApiRouteCustom(customRoute("whole/:id", mode, E2ePathParameterHandlerIdDto))
		public readWhole(@Param() parameters: E2ePathParameterHandlerIdDto): Record<string, unknown> {
			return { id: parameters.id, type: typeof parameters.id };
		}
	}

	return secure(`E2ePathParameterHandler${segment}`, mode, ServedController, `path-parameter/handler/${segment}`);
}

/**
 * Wraps one refused route in a securable controller of its own.
 * @param {string} name - Unique controller name.
 * @param {EApiAuthorizationMode} mode - Authorization mode of the controller.
 * @param {new () => unknown} controller - Controller class with the route.
 * @param {string} [path] - Controller path.
 * @returns {new () => unknown} The securable controller.
 */
function secure(name: string, mode: EApiAuthorizationMode, controller: new () => unknown, path: string = `path-parameter/handler/refused/${name}`): new () => unknown {
	Object.defineProperty(controller, "name", { value: name });
	ApiController<E2ePathParameterHandlerItemEntity>({ authorization: mode === EApiAuthorizationMode.IAM ? IAM_AUTHORIZATION : HOOKS_AUTHORIZATION, entity: E2ePathParameterHandlerItemEntity, name, path, routes: NO_GENERATED_ROUTES })(controller as never);
	ApiControllerSecurable()(controller);

	return controller;
}

export const E2ePathParameterHandlerIamController: new () => unknown = buildServedController(EApiAuthorizationMode.IAM);
export const E2ePathParameterHandlerHooksController: new () => unknown = buildServedController(EApiAuthorizationMode.HOOKS);

export interface IE2ePathParameterHandlerRefusedCase {
	build: (mode: EApiAuthorizationMode) => new () => unknown;
	message: string;
	name: string;
}

// Each route below could give its handler or its policy another path value than authorization checked, so the application must not start.
export const E2E_PATH_PARAMETER_HANDLER_REFUSED: Array<IE2ePathParameterHandlerRefusedCase> = [
	{
		build: (mode: EApiAuthorizationMode): new () => unknown => {
			class PipeController {
				@ApiRouteCustom(customRoute(":id", mode, E2ePathParameterHandlerIdDto))
				public read(@Param("id", ParseIntPipe) id: number): number {
					return id;
				}
			}

			return secure(`E2ePathParameterHandlerPipe${mode}`, mode, PipeController);
		},
		message: 'method "read" converts the path parameter "id" with a pipe on @Param',
		name: "a pipe on @Param",
	},
	{
		build: (mode: EApiAuthorizationMode): new () => unknown => {
			class NumberController {
				@ApiRouteCustom(customRoute(":id", mode, E2ePathParameterHandlerIdDto))
				public read(@Param("id") id: number): number {
					return id;
				}
			}

			return secure(`E2ePathParameterHandlerNumber${mode}`, mode, NumberController);
		},
		message: 'method "read" declares the path parameter "id" as Number on @Param',
		name: "a @Param that is not a string",
	},
	{
		build: (mode: EApiAuthorizationMode): new () => unknown => {
			class OtherDtoController {
				@ApiRouteCustom(customRoute(":id", mode, E2ePathParameterHandlerIdDto))
				// The PARAMETERS DTO takes the type of the last whole @Param(), so the first one keeps its own class.
				public read(@Param() other: E2ePathParameterHandlerOtherDto, @Param() parameters: E2ePathParameterHandlerIdDto): unknown {
					return [other, parameters];
				}
			}

			return secure(`E2ePathParameterHandlerOtherDto${mode}`, mode, OtherDtoController);
		},
		message: 'method "read" reads its path parameters with @Param() typed as E2ePathParameterHandlerOtherDto',
		name: "a @Param() typed as another DTO",
	},
	{
		build: (mode: EApiAuthorizationMode): new () => unknown => {
			class NoDtoController {
				@ApiRouteCustom(customRoute(":id", mode))
				public read(@Param("id") id: string): string {
					return id;
				}
			}

			return secure(`E2ePathParameterHandlerNoDto${mode}`, mode, NoDtoController);
		},
		message: 'method "read" has the path parameter "id" but declares no PARAMETERS DTO',
		name: "a @Param without a PARAMETERS DTO",
	},
	{
		build: (mode: EApiAuthorizationMode): new () => unknown => {
			class NoDtoNoParamController {
				@ApiRouteCustom(customRoute(":id", mode))
				public read(): string {
					return "read";
				}
			}

			return secure(`E2ePathParameterHandlerNoDtoNoParam${mode}`, mode, NoDtoNoParamController);
		},
		message: 'method "read" has the path parameter "id" but declares no PARAMETERS DTO',
		name: "a path parameter only a policy can read, without a PARAMETERS DTO",
	},
	{
		build: (mode: EApiAuthorizationMode): new () => unknown => {
			class UndescribedController {
				@ApiRouteCustom(customRoute(":id/:code", mode, E2ePathParameterHandlerCodeDto))
				public read(@Param("code") code: string): string {
					return code;
				}
			}

			return secure(`E2ePathParameterHandlerUndescribed${mode}`, mode, UndescribedController);
		},
		message: 'method "read" has the path parameter "id", which its PARAMETERS DTO "E2ePathParameterHandlerCodeDto" does not describe',
		name: "a path parameter the PARAMETERS DTO does not describe",
	},
	{
		build: (mode: EApiAuthorizationMode): new () => unknown => {
			class MethodController {
				@ApiMethod<E2ePathParameterHandlerItemEntity>({ metadata: { resource: { action: "read", entity: E2ePathParameterHandlerItemEntity }, response: { status: HttpStatus.OK, type: undefined }, route: { method: RequestMethod.GET, path: ":id" }, security: { authorization: { mode } } } } as never)
				public read(@Param("id") id: string): string {
					return id;
				}
			}

			return secure(`E2ePathParameterHandlerMethod${mode}`, mode, MethodController);
		},
		message: 'method "read" has the path parameter "id" but declares no PARAMETERS DTO',
		name: "an @ApiMethod route with a path parameter",
	},
];
