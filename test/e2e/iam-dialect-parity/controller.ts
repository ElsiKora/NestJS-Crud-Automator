import type { ExecutionContext } from "@nestjs/common";

import { Inject, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { ApiController, ApiControllerSecurable, ApiService, ApiServiceBase, EApiAuthenticationType, EApiAuthorizationMode, EApiRouteType } from "../../../src/index";

import { E2eIamDialectItemEntity } from "./item.entity";

export const E2E_IAM_DIALECT_OPERATOR_ID: string = "0b6f1c1e-7d2a-4c8e-9a51-3f4e2d1c0b9a";

// The one principal; a test may change its `operatorId` attribute and must restore it.
export const E2E_IAM_DIALECT_USER: Record<string, unknown> = { id: "user-1", name: "ann", operatorId: E2E_IAM_DIALECT_OPERATOR_ID, rank: 1 };

export const E2E_IAM_DIALECT_ITEM_AUTHORIZATION = {
	defaultMode: EApiAuthorizationMode.IAM,
	policyNamespace: "dial:item",
	resourceDefinition: {
		entity: E2eIamDialectItemEntity,
		fields: ["id", "kind", "name", "operatorId", "price", "rank", "tenantId"].map((path: string) => ({ isFilterable: true, path: `resource.${path}`, queryPath: path })).concat([{ isFilterable: true, path: "resource.ownerName", queryPath: "owner.name" }]),
		namespace: "dial:item",
		resourcePath: "dial:tenant/{tenantId}/item/{id}",
		resourceType: "dial:item",
	},
};

export const E2E_IAM_DIALECT_NAME_AUTHORIZATION = {
	defaultMode: EApiAuthorizationMode.IAM,
	policyNamespace: "dialn:item",
	resourceDefinition: {
		entity: E2eIamDialectItemEntity,
		fields: [
			{ isFilterable: true, path: "resource.id", queryPath: "id" },
			{ isFilterable: true, path: "resource.name", queryPath: "name" },
		],
		namespace: "dialn:item",
		resourcePath: "dialn:item/{name}",
		resourceType: "dialn:item",
	},
};

export const E2E_IAM_DIALECT_OPERATOR_AUTHORIZATION = {
	defaultMode: EApiAuthorizationMode.IAM,
	policyNamespace: "dialo:item",
	resourceDefinition: {
		entity: E2eIamDialectItemEntity,
		fields: [
			{ isFilterable: true, path: "resource.id", queryPath: "id" },
			{ isFilterable: true, path: "resource.operatorId", queryPath: "operatorId" },
		],
		namespace: "dialo:item",
		resourcePath: "dialo:item/{id}",
		resourceType: "dialo:item",
	},
};

export const E2E_IAM_DIALECT_OPERATOR_PATH_AUTHORIZATION = {
	defaultMode: EApiAuthorizationMode.IAM,
	policyNamespace: "dialu:item",
	resourceDefinition: {
		entity: E2eIamDialectItemEntity,
		fields: [
			{ isFilterable: true, path: "resource.id", queryPath: "id" },
			{ isFilterable: true, path: "resource.operatorId", queryPath: "operatorId" },
		],
		namespace: "dialu:item",
		resourcePath: "dialu:item/{operatorId}",
		resourceType: "dialu:item",
	},
};

@Injectable()
@ApiService({ entity: E2eIamDialectItemEntity })
export class E2eIamDialectItemService extends ApiServiceBase<E2eIamDialectItemEntity> {
	@InjectRepository(E2eIamDialectItemEntity)
	public readonly repository!: Repository<E2eIamDialectItemEntity>;
}

/**
 * Authenticates every request as the one test user.
 */
@Injectable()
export class E2eIamDialectGuard {
	public canActivate(context: ExecutionContext): boolean {
		context.switchToHttp().getRequest<{ user?: unknown }>().user = E2E_IAM_DIALECT_USER;

		return true;
	}
}

const authentication = { guard: E2eIamDialectGuard, type: EApiAuthenticationType.USER } as never;

@ApiControllerSecurable()
@ApiController<E2eIamDialectItemEntity>({
	authorization: E2E_IAM_DIALECT_ITEM_AUTHORIZATION as never,
	entity: E2eIamDialectItemEntity,
	name: "E2eIamDialectItems",
	path: "iam-dialect/items",
	routes: {
		[EApiRouteType.CREATE]: { generation: { isEnabled: false } },
		[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
		// A row route has no tenantId path parameter for the resource path, so only the list is served; the simulator reads rows.
		[EApiRouteType.GET]: { generation: { isEnabled: false } },
		[EApiRouteType.GET_LIST]: { security: { authentication } },
		[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
		[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
	} as never,
})
export class E2eIamDialectItemController {
	@Inject(E2eIamDialectItemService)
	public readonly service!: E2eIamDialectItemService;
}

@ApiControllerSecurable()
@ApiController<E2eIamDialectItemEntity>({
	authorization: E2E_IAM_DIALECT_NAME_AUTHORIZATION as never,
	entity: E2eIamDialectItemEntity,
	name: "E2eIamDialectNames",
	path: "iam-dialect/names",
	routes: {
		[EApiRouteType.CREATE]: { generation: { isEnabled: false } },
		[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
		[EApiRouteType.GET]: { generation: { isEnabled: false } },
		[EApiRouteType.GET_LIST]: { security: { authentication } },
		[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
		[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
	} as never,
})
export class E2eIamDialectNameController {
	@Inject(E2eIamDialectItemService)
	public readonly service!: E2eIamDialectItemService;
}

// Gameport's baseline: rows of the principal's operator, on the list and on a read.
@ApiControllerSecurable()
@ApiController<E2eIamDialectItemEntity>({
	authorization: E2E_IAM_DIALECT_OPERATOR_AUTHORIZATION as never,
	entity: E2eIamDialectItemEntity,
	name: "E2eIamDialectOperators",
	path: "iam-dialect/operators",
	routes: {
		[EApiRouteType.CREATE]: { generation: { isEnabled: false } },
		[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
		[EApiRouteType.GET]: { security: { authentication } },
		[EApiRouteType.GET_LIST]: { security: { authentication } },
		[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
		[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
	} as never,
})
export class E2eIamDialectOperatorController {
	@Inject(E2eIamDialectItemService)
	public readonly service!: E2eIamDialectItemService;
}

// Row patterns over a uuid placeholder; a row route has no operatorId path parameter, so only the list is served.
@ApiControllerSecurable()
@ApiController<E2eIamDialectItemEntity>({
	authorization: E2E_IAM_DIALECT_OPERATOR_PATH_AUTHORIZATION as never,
	entity: E2eIamDialectItemEntity,
	name: "E2eIamDialectOperatorPaths",
	path: "iam-dialect/operator-paths",
	routes: {
		[EApiRouteType.CREATE]: { generation: { isEnabled: false } },
		[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
		[EApiRouteType.GET]: { generation: { isEnabled: false } },
		[EApiRouteType.GET_LIST]: { security: { authentication } },
		[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
		[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
	} as never,
})
export class E2eIamDialectOperatorPathController {
	@Inject(E2eIamDialectItemService)
	public readonly service!: E2eIamDialectItemService;
}
