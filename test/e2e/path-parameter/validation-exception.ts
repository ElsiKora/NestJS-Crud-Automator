import type { ExecutionContext } from "@nestjs/common";

import { Inject, Injectable, Param, RequestMethod } from "@nestjs/common";
import { ApiProperty } from "@nestjs/swagger";
import { InjectRepository } from "@nestjs/typeorm";
import { Column, Entity, PrimaryColumn, Repository } from "typeorm";

import { ApiController, ApiControllerObservable, ApiControllerSecurable, ApiPropertyCopy, ApiPropertyDescribe, ApiRouteCustom, ApiService, ApiServiceBase, EApiAuthenticationType, EApiAuthorizationMode, EApiDtoType, EApiPolicyEffect, EApiPolicySourceType, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "../../../src/index";

export const E2E_PATH_PARAMETER_EXCEPTION_ID: string = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

@Entity("e2e_path_parameter_exception_items")
export class E2ePathParameterExceptionItemEntity {
	@PrimaryColumn({ type: "uuid" })
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({ description: "label", exampleValue: "Label", format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING })
	public label!: string;
}

@Injectable()
@ApiService({ entity: E2ePathParameterExceptionItemEntity })
export class E2ePathParameterExceptionItemService extends ApiServiceBase<E2ePathParameterExceptionItemEntity> {
	@InjectRepository(E2ePathParameterExceptionItemEntity)
	public readonly repository!: Repository<E2ePathParameterExceptionItemEntity>;
}

/**
 * Authenticates every request as the one principal the policy document is attached to.
 */
@Injectable()
export class E2ePathParameterExceptionGuard {
	public canActivate(context: ExecutionContext): boolean {
		context.switchToHttp().getRequest<{ user?: unknown }>().user = { id: "ppx" };

		return true;
	}
}

/**
 * Copies the generated PARAMETERS decorators of the UUID key, as a Core custom route does.
 */
export class E2ePathParameterExceptionParametersDto {
	@ApiPropertyCopy({ dtoType: EApiDtoType.PARAMETERS, entity: () => E2ePathParameterExceptionItemEntity, method: EApiRouteType.GET, propertyName: "id" })
	public id!: string;
}

/**
 * Response of the custom route: the path value the handler received.
 */
export class E2ePathParameterExceptionResponseDto {
	@ApiProperty({ type: String })
	public value!: string;
}

const authentication = { guard: E2ePathParameterExceptionGuard, type: EApiAuthenticationType.USER } as never;
const disabledRoute = { generation: { isEnabled: false } };
const readOnlyRoutes = { [EApiRouteType.CREATE]: disabledRoute, [EApiRouteType.DELETE]: disabledRoute, [EApiRouteType.GET_LIST]: disabledRoute, [EApiRouteType.PARTIAL_UPDATE]: disabledRoute, [EApiRouteType.UPDATE]: disabledRoute };
const authorization = { defaultMode: EApiAuthorizationMode.IAM, policyNamespace: "ppx", resourceDefinition: { entity: E2ePathParameterExceptionItemEntity, fields: [{ isFilterable: true, path: "resource.id", queryPath: "id" }], namespace: "ppx", resourcePath: "ppx/{id}", resourceType: "ppx" } } as never;

@ApiControllerSecurable()
@ApiController<E2ePathParameterExceptionItemEntity>({ authorization, entity: E2ePathParameterExceptionItemEntity, name: "E2ePathParameterExceptionSecured", path: "path-parameter/exception/secured", routes: { ...readOnlyRoutes, [EApiRouteType.GET]: { security: { authentication } } } as never })
export class E2ePathParameterExceptionSecuredController {
	@Inject(E2ePathParameterExceptionItemService)
	public readonly service!: E2ePathParameterExceptionItemService;

	@ApiRouteCustom({
		documentation: { description: "Reads one path value", summary: "Reads one path value" },
		dto: { [EApiDtoType.PARAMETERS]: E2ePathParameterExceptionParametersDto },
		resource: { action: "read", entity: E2ePathParameterExceptionItemEntity },
		response: { errors: {}, serialization: { isEnabled: false }, status: 200, type: E2ePathParameterExceptionResponseDto },
		route: { method: RequestMethod.GET, path: "custom/:id" },
		security: { authentication, authorization: { mode: EApiAuthorizationMode.IAM } },
	} as never)
	public read(@Param("id") id: unknown): E2ePathParameterExceptionResponseDto {
		return { value: String(id) };
	}
}

@ApiControllerObservable()
@ApiController<E2ePathParameterExceptionItemEntity>({ entity: E2ePathParameterExceptionItemEntity, name: "E2ePathParameterExceptionOpen", path: "path-parameter/exception/open", routes: readOnlyRoutes as never })
export class E2ePathParameterExceptionOpenController {
	@Inject(E2ePathParameterExceptionItemService)
	public readonly service!: E2ePathParameterExceptionItemService;
}

export const E2E_PATH_PARAMETER_EXCEPTION_DOCUMENTS: Array<Record<string, unknown>> = [{ document: { Statement: [{ Action: ["ppx:read"], Effect: EApiPolicyEffect.ALLOW, Resource: ["ppx/*"] }], Version: "2012-10-17" }, id: "ppx", namespace: "ppx", sourceType: EApiPolicySourceType.DATABASE, version: "1" }];
