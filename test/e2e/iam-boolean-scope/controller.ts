import type { ExecutionContext } from "@nestjs/common";

import { Inject, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { ApiController, ApiControllerSecurable, ApiService, ApiServiceBase, EApiAuthenticationType, EApiAuthorizationMode, EApiRouteType } from "../../../src/index";

import { E2eIamBooleanItemEntity } from "./item.entity";

export const E2E_IAM_BOOLEAN_USER: Record<string, unknown> = { featured: true, id: "user-1", list: ["true"], notFeatured: false, numericFeatured: 1 };

// Field paths equal their query paths, so the in-memory evaluator reads the same nested value the SQL scope compares.
const FIELD_PATHS: Array<string> = ["id", "isFeatured", "isInternal", "meta.isLocked", "owner.isActive", "owner.company.isVerified"];

export const E2E_IAM_BOOLEAN_ITEM_AUTHORIZATION = {
	defaultMode: EApiAuthorizationMode.IAM,
	policyNamespace: "bool:item",
	resourceDefinition: {
		entity: E2eIamBooleanItemEntity,
		fields: [...FIELD_PATHS.map((path: string) => ({ isFilterable: true, path: `resource.${path}`, queryPath: path })), { isFilterable: true, path: "resource.ownerMissing", queryPath: "owner.missing" }],
		namespace: "bool:item",
		resourcePath: "bool:item/{id}",
		resourceType: "bool:item",
	},
};

export const E2E_IAM_BOOLEAN_PLACEHOLDER_AUTHORIZATION = {
	defaultMode: EApiAuthorizationMode.IAM,
	policyNamespace: "boolp:item",
	resourceDefinition: {
		entity: E2eIamBooleanItemEntity,
		fields: [
			{ isFilterable: true, path: "resource.id", queryPath: "id" },
			{ isFilterable: true, path: "resource.isFeatured", queryPath: "isFeatured" },
		],
		namespace: "boolp:item",
		resourcePath: "boolp:item/{isFeatured}",
		resourceType: "boolp:item",
	},
};

@Injectable()
@ApiService({ entity: E2eIamBooleanItemEntity })
export class E2eIamBooleanItemService extends ApiServiceBase<E2eIamBooleanItemEntity> {
	@InjectRepository(E2eIamBooleanItemEntity)
	public readonly repository!: Repository<E2eIamBooleanItemEntity>;
}

/**
 * Authenticates every request as the one test user.
 */
@Injectable()
export class E2eIamBooleanGuard {
	public canActivate(context: ExecutionContext): boolean {
		context.switchToHttp().getRequest<{ user?: unknown }>().user = E2E_IAM_BOOLEAN_USER;

		return true;
	}
}

const authentication = { guard: E2eIamBooleanGuard, type: EApiAuthenticationType.USER } as never;

@ApiControllerSecurable()
@ApiController<E2eIamBooleanItemEntity>({
	authorization: E2E_IAM_BOOLEAN_ITEM_AUTHORIZATION as never,
	entity: E2eIamBooleanItemEntity,
	name: "E2eIamBooleanItems",
	path: "iam-boolean/items",
	routes: {
		[EApiRouteType.CREATE]: { generation: { isEnabled: false } },
		[EApiRouteType.DELETE]: { security: { authentication } },
		[EApiRouteType.GET]: { security: { authentication } },
		[EApiRouteType.GET_LIST]: { security: { authentication } },
		[EApiRouteType.PARTIAL_UPDATE]: { security: { authentication } },
		[EApiRouteType.UPDATE]: { security: { authentication } },
	} as never,
})
export class E2eIamBooleanItemController {
	@Inject(E2eIamBooleanItemService)
	public readonly service!: E2eIamBooleanItemService;
}

@ApiControllerSecurable()
@ApiController<E2eIamBooleanItemEntity>({
	authorization: E2E_IAM_BOOLEAN_PLACEHOLDER_AUTHORIZATION as never,
	entity: E2eIamBooleanItemEntity,
	name: "E2eIamBooleanPlaceholderItems",
	path: "iam-boolean/placeholder-items",
	routes: {
		[EApiRouteType.CREATE]: { generation: { isEnabled: false } },
		[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
		[EApiRouteType.GET]: { generation: { isEnabled: false } },
		[EApiRouteType.GET_LIST]: { security: { authentication } },
		[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
		[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
	} as never,
})
export class E2eIamBooleanPlaceholderController {
	@Inject(E2eIamBooleanItemService)
	public readonly service!: E2eIamBooleanItemService;
}
