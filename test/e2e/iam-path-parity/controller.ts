import type { ExecutionContext } from "@nestjs/common";

import { Inject, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { ApiController, ApiControllerSecurable, ApiService, ApiServiceBase, EApiAuthenticationType, EApiAuthorizationMode, EApiRouteType } from "../../../src/index";

import { E2eIamParityItemEntity } from "./item.entity";

export const E2E_IAM_PARITY_USER: Record<string, unknown> = { id: "user-1", ownerId: "o-1", tag: "x" };

// Root, embedded, and relation columns one and two relations away.
const QUERY_PATHS: Array<string> = ["id", "isFeatured", "meta.isLocked", "meta.note", "owner.id", "owner.tag", "owner.isActive", "owner.company.name", "owner.company.isVerified"];

// Every query path under its own name, so the in-memory evaluator could read the condition path literally.
export const E2E_IAM_PARITY_DIRECT_FIELDS: Array<{ path: string; queryPath: string }> = QUERY_PATHS.map((queryPath: string) => ({ path: queryPath, queryPath }));

// Every query path but `id` under an alias, so a condition path differs from the query path the database compares.
export const E2E_IAM_PARITY_ALIAS_FIELDS: Array<{ path: string; queryPath: string }> = [
	{ path: "id", queryPath: "id" },
	{ path: "featured", queryPath: "isFeatured" },
	{ path: "locked", queryPath: "meta.isLocked" },
	{ path: "note", queryPath: "meta.note" },
	{ path: "ownerId", queryPath: "owner.id" },
	{ path: "ownerTag", queryPath: "owner.tag" },
	{ path: "active", queryPath: "owner.isActive" },
	{ path: "companyName", queryPath: "owner.company.name" },
	{ path: "verified", queryPath: "owner.company.isVerified" },
];

const authorizationFor = (namespace: string, resourcePath: string, fields: Array<{ path: string; queryPath: string }>) => ({
	defaultMode: EApiAuthorizationMode.IAM,
	policyNamespace: namespace,
	resourceDefinition: {
		entity: E2eIamParityItemEntity,
		fields: fields.map(({ path, queryPath }: { path: string; queryPath: string }) => ({ isFilterable: true, path: `resource.${path}`, queryPath })),
		namespace,
		resourcePath,
		resourceType: namespace,
	},
});

export const E2E_IAM_PARITY_DIRECT_AUTHORIZATION = authorizationFor("parity:item", "parity:item/{id}", E2E_IAM_PARITY_DIRECT_FIELDS);

export const E2E_IAM_PARITY_ALIAS_AUTHORIZATION = authorizationFor("paritya:item", "paritya:item/{id}", E2E_IAM_PARITY_ALIAS_FIELDS);

// Resource paths whose placeholder names a declared field read through a nested query path.
export const E2E_IAM_PARITY_ALIAS_PLACEHOLDER_AUTHORIZATION = authorizationFor("parityap:item", "parityap:item/{ownerTag}", E2E_IAM_PARITY_ALIAS_FIELDS);

export const E2E_IAM_PARITY_DOTTED_PLACEHOLDER_AUTHORIZATION = authorizationFor("paritydp:item", "paritydp:item/{owner.tag}", E2E_IAM_PARITY_DIRECT_FIELDS);

// Query paths through a OneToMany and a ManyToMany relation: one row holds many values, so neither compiles or reads.
export const E2E_IAM_PARITY_TAG_AUTHORIZATION = authorizationFor("paritytg:item", "paritytg:item/{id}", [{ path: "tagName", queryPath: "tags.name" }]);

export const E2E_IAM_PARITY_LABEL_AUTHORIZATION = authorizationFor("paritylb:item", "paritylb:item/{id}", [{ path: "labelName", queryPath: "labels.name" }]);

@Injectable()
@ApiService({ entity: E2eIamParityItemEntity })
export class E2eIamParityItemService extends ApiServiceBase<E2eIamParityItemEntity> {
	@InjectRepository(E2eIamParityItemEntity)
	public readonly repository!: Repository<E2eIamParityItemEntity>;
}

/**
 * Authenticates every request as the one test user.
 */
@Injectable()
export class E2eIamParityGuard {
	public canActivate(context: ExecutionContext): boolean {
		context.switchToHttp().getRequest<{ user?: unknown }>().user = E2E_IAM_PARITY_USER;

		return true;
	}
}

const authentication = { guard: E2eIamParityGuard, type: EApiAuthenticationType.USER } as never;

const ROW_ROUTES = {
	[EApiRouteType.CREATE]: { generation: { isEnabled: false } },
	[EApiRouteType.DELETE]: { security: { authentication } },
	[EApiRouteType.GET]: { security: { authentication } },
	[EApiRouteType.GET_LIST]: { security: { authentication } },
	[EApiRouteType.PARTIAL_UPDATE]: { security: { authentication } },
	[EApiRouteType.UPDATE]: { security: { authentication } },
} as never;

const LIST_ROUTES = {
	[EApiRouteType.CREATE]: { generation: { isEnabled: false } },
	[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
	[EApiRouteType.GET]: { generation: { isEnabled: false } },
	[EApiRouteType.GET_LIST]: { security: { authentication } },
	[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
	[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
} as never;

@ApiControllerSecurable()
@ApiController<E2eIamParityItemEntity>({ authorization: E2E_IAM_PARITY_DIRECT_AUTHORIZATION as never, entity: E2eIamParityItemEntity, name: "E2eIamParityItems", path: "iam-parity/items", routes: ROW_ROUTES })
export class E2eIamParityItemController {
	@Inject(E2eIamParityItemService)
	public readonly service!: E2eIamParityItemService;
}

@ApiControllerSecurable()
@ApiController<E2eIamParityItemEntity>({ authorization: E2E_IAM_PARITY_ALIAS_AUTHORIZATION as never, entity: E2eIamParityItemEntity, name: "E2eIamParityAliasItems", path: "iam-parity/alias-items", routes: ROW_ROUTES })
export class E2eIamParityAliasItemController {
	@Inject(E2eIamParityItemService)
	public readonly service!: E2eIamParityItemService;
}

@ApiControllerSecurable()
@ApiController<E2eIamParityItemEntity>({ authorization: E2E_IAM_PARITY_ALIAS_PLACEHOLDER_AUTHORIZATION as never, entity: E2eIamParityItemEntity, name: "E2eIamParityAliasPlaceholderItems", path: "iam-parity/alias-placeholder-items", routes: LIST_ROUTES })
export class E2eIamParityAliasPlaceholderController {
	@Inject(E2eIamParityItemService)
	public readonly service!: E2eIamParityItemService;
}

@ApiControllerSecurable()
@ApiController<E2eIamParityItemEntity>({ authorization: E2E_IAM_PARITY_DOTTED_PLACEHOLDER_AUTHORIZATION as never, entity: E2eIamParityItemEntity, name: "E2eIamParityDottedPlaceholderItems", path: "iam-parity/dotted-placeholder-items", routes: LIST_ROUTES })
export class E2eIamParityDottedPlaceholderController {
	@Inject(E2eIamParityItemService)
	public readonly service!: E2eIamParityItemService;
}

@ApiControllerSecurable()
@ApiController<E2eIamParityItemEntity>({ authorization: E2E_IAM_PARITY_TAG_AUTHORIZATION as never, entity: E2eIamParityItemEntity, name: "E2eIamParityTagItems", path: "iam-parity/tag-items", routes: LIST_ROUTES })
export class E2eIamParityTagController {
	@Inject(E2eIamParityItemService)
	public readonly service!: E2eIamParityItemService;
}

@ApiControllerSecurable()
@ApiController<E2eIamParityItemEntity>({ authorization: E2E_IAM_PARITY_LABEL_AUTHORIZATION as never, entity: E2eIamParityItemEntity, name: "E2eIamParityLabelItems", path: "iam-parity/label-items", routes: LIST_ROUTES })
export class E2eIamParityLabelController {
	@Inject(E2eIamParityItemService)
	public readonly service!: E2eIamParityItemService;
}
