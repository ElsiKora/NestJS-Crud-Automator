import type { ExecutionContext } from "@nestjs/common";

import { Inject, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Column, Entity, PrimaryColumn, Repository } from "typeorm";

import { ApiController, ApiControllerSecurable, ApiPropertyDescribe, ApiService, ApiServiceBase, EApiAuthenticationType, EApiAuthorizationMode, EApiPolicyEffect, EApiPolicySourceType, EApiPropertyDescribeType, EApiPropertyNumberType, EApiPropertyStringType, EApiRouteType } from "../../../src/index";

import { E2E_PATH_PARAMETER_INT_MAXIMUM } from "./entity";

export const E2E_PATH_PARAMETER_IAM_DENIED_INT_ID: number = 16;
export const E2E_PATH_PARAMETER_IAM_ALLOWED_INT_ID: number = 1;
export const E2E_PATH_PARAMETER_IAM_DENIED_UUID_ID: string = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
export const E2E_PATH_PARAMETER_IAM_ALLOWED_UUID_ID: string = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const IAM_LABEL_DESCRIBE = { description: "label", exampleValue: "Label", format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING } as const;

@Entity("e2e_path_parameter_iam_int_items")
export class E2ePathParameterIamIntItemEntity {
	@PrimaryColumn({ type: "int" })
	@ApiPropertyDescribe({ description: "id", exampleValue: 1, format: EApiPropertyNumberType.INTEGER, maximum: E2E_PATH_PARAMETER_INT_MAXIMUM, minimum: 1, multipleOf: 1, type: EApiPropertyDescribeType.NUMBER })
	public id!: number;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe(IAM_LABEL_DESCRIBE)
	public label!: string;
}

@Entity("e2e_path_parameter_iam_uuid_items")
export class E2ePathParameterIamUuidItemEntity {
	@PrimaryColumn({ type: "uuid" })
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe(IAM_LABEL_DESCRIBE)
	public label!: string;
}

@Injectable()
@ApiService({ entity: E2ePathParameterIamIntItemEntity })
export class E2ePathParameterIamIntItemService extends ApiServiceBase<E2ePathParameterIamIntItemEntity> {
	@InjectRepository(E2ePathParameterIamIntItemEntity)
	public readonly repository!: Repository<E2ePathParameterIamIntItemEntity>;
}

@Injectable()
@ApiService({ entity: E2ePathParameterIamUuidItemEntity })
export class E2ePathParameterIamUuidItemService extends ApiServiceBase<E2ePathParameterIamUuidItemEntity> {
	@InjectRepository(E2ePathParameterIamUuidItemEntity)
	public readonly repository!: Repository<E2ePathParameterIamUuidItemEntity>;
}

/**
 * Authenticates every request as the principal named after the controller path segment, so each controller is evaluated against its own policy.
 */
@Injectable()
export class E2ePathParameterIamGuard {
	public canActivate(context: ExecutionContext): boolean {
		const request: { url: string; user?: unknown } = context.switchToHttp().getRequest<{ url: string; user?: unknown }>();
		request.user = { id: /\/path-parameter\/iam\/([\w-]+)\//.exec(request.url)?.[1] ?? "anonymous" };

		return true;
	}
}

const authentication = { guard: E2ePathParameterIamGuard, type: EApiAuthenticationType.USER } as never;
const securedRoutes = {
	[EApiRouteType.CREATE]: { generation: { isEnabled: false } },
	[EApiRouteType.DELETE]: { security: { authentication } },
	[EApiRouteType.GET]: { security: { authentication } },
	[EApiRouteType.GET_LIST]: { generation: { isEnabled: false } },
	[EApiRouteType.PARTIAL_UPDATE]: { security: { authentication } },
	[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
} as never;

const buildAuthorization = (namespace: string, entity: new () => unknown): never =>
	({
		defaultMode: EApiAuthorizationMode.IAM,
		policyNamespace: namespace,
		resourceDefinition: { entity, fields: [{ isFilterable: true, path: "resource.id", queryPath: "id" }], namespace, resourcePath: `${namespace}/{id}`, resourceType: namespace },
	}) as never;

@ApiControllerSecurable()
@ApiController<E2ePathParameterIamIntItemEntity>({ authorization: buildAuthorization("pp-int-deny:item", E2ePathParameterIamIntItemEntity), entity: E2ePathParameterIamIntItemEntity, name: "E2ePathParameterIamIntDeny", path: "path-parameter/iam/int-deny", routes: securedRoutes })
export class E2ePathParameterIamIntDenyController {
	@Inject(E2ePathParameterIamIntItemService)
	public readonly service!: E2ePathParameterIamIntItemService;
}

@ApiControllerSecurable()
@ApiController<E2ePathParameterIamIntItemEntity>({ authorization: buildAuthorization("pp-int-cond:item", E2ePathParameterIamIntItemEntity), entity: E2ePathParameterIamIntItemEntity, name: "E2ePathParameterIamIntCond", path: "path-parameter/iam/int-cond", routes: securedRoutes })
export class E2ePathParameterIamIntConditionController {
	@Inject(E2ePathParameterIamIntItemService)
	public readonly service!: E2ePathParameterIamIntItemService;
}

@ApiControllerSecurable()
@ApiController<E2ePathParameterIamIntItemEntity>({ authorization: buildAuthorization("pp-int-literal:item", E2ePathParameterIamIntItemEntity), entity: E2ePathParameterIamIntItemEntity, name: "E2ePathParameterIamIntLiteral", path: "path-parameter/iam/int-literal", routes: securedRoutes })
export class E2ePathParameterIamIntLiteralController {
	@Inject(E2ePathParameterIamIntItemService)
	public readonly service!: E2ePathParameterIamIntItemService;
}

@ApiControllerSecurable()
@ApiController<E2ePathParameterIamUuidItemEntity>({ authorization: buildAuthorization("pp-uuid-deny:item", E2ePathParameterIamUuidItemEntity), entity: E2ePathParameterIamUuidItemEntity, name: "E2ePathParameterIamUuidDeny", path: "path-parameter/iam/uuid-deny", routes: securedRoutes })
export class E2ePathParameterIamUuidDenyController {
	@Inject(E2ePathParameterIamUuidItemService)
	public readonly service!: E2ePathParameterIamUuidItemService;
}

@ApiControllerSecurable()
@ApiController<E2ePathParameterIamUuidItemEntity>({ authorization: buildAuthorization("pp-uuid-cond:item", E2ePathParameterIamUuidItemEntity), entity: E2ePathParameterIamUuidItemEntity, name: "E2ePathParameterIamUuidCond", path: "path-parameter/iam/uuid-cond", routes: securedRoutes })
export class E2ePathParameterIamUuidConditionController {
	@Inject(E2ePathParameterIamUuidItemService)
	public readonly service!: E2ePathParameterIamUuidItemService;
}

const ROW_ACTIONS = (namespace: string): Array<string> => [`${namespace}:read`, `${namespace}:delete`, `${namespace}:partial_update`];

/**
 * Builds one policy document, attached to the principal of the same id.
 * @param {string} id - Document and principal id.
 * @param {string} namespace - Policy namespace.
 * @param {Array<Record<string, unknown>>} statements - Policy statements.
 * @returns {Record<string, unknown>} Policy document record.
 */
const buildDocument = (id: string, namespace: string, statements: Array<Record<string, unknown>>): Record<string, unknown> => ({ document: { Statement: statements, Version: "2012-10-17" }, id, namespace, sourceType: EApiPolicySourceType.DATABASE, version: "1" });

export const E2E_PATH_PARAMETER_IAM_DOCUMENTS: Array<Record<string, unknown>> = [
	buildDocument("int-deny", "pp-int-deny:item", [
		{ Action: ROW_ACTIONS("pp-int-deny:item"), Effect: EApiPolicyEffect.ALLOW, Resource: ["pp-int-deny:item/*"] },
		{ Action: ROW_ACTIONS("pp-int-deny:item"), Effect: EApiPolicyEffect.DENY, Resource: [`pp-int-deny:item/${String(E2E_PATH_PARAMETER_IAM_DENIED_INT_ID)}`] },
	]),
	// The recipe from the authorization guide: the row must equal the path value.
	buildDocument("int-cond", "pp-int-cond:item", [{ Action: ROW_ACTIONS("pp-int-cond:item"), Condition: { StringEquals: { "resource.id": "${request.parameters.id}" } }, Effect: EApiPolicyEffect.ALLOW, Resource: ["pp-int-cond:item/*"] }]),
	buildDocument("int-literal", "pp-int-literal:item", [{ Action: ROW_ACTIONS("pp-int-literal:item"), Condition: { StringEquals: { "resource.id": String(E2E_PATH_PARAMETER_IAM_DENIED_INT_ID) } }, Effect: EApiPolicyEffect.ALLOW, Resource: ["pp-int-literal:item/*"] }]),
	buildDocument("uuid-deny", "pp-uuid-deny:item", [
		{ Action: ROW_ACTIONS("pp-uuid-deny:item"), Effect: EApiPolicyEffect.ALLOW, Resource: ["pp-uuid-deny:item/*"] },
		{ Action: ROW_ACTIONS("pp-uuid-deny:item"), Effect: EApiPolicyEffect.DENY, Resource: [`pp-uuid-deny:item/${E2E_PATH_PARAMETER_IAM_DENIED_UUID_ID}`] },
	]),
	buildDocument("uuid-cond", "pp-uuid-cond:item", [{ Action: ROW_ACTIONS("pp-uuid-cond:item"), Condition: { StringEquals: { "resource.id": "${request.parameters.id}" } }, Effect: EApiPolicyEffect.ALLOW, Resource: ["pp-uuid-cond:item/*"] }]),
];
