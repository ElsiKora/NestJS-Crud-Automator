import { HttpStatus, Inject, Param, RequestMethod } from "@nestjs/common";
import { Expose, Type } from "class-transformer";

import { ApiController, ApiRouteCustom, EApiControllerGetListQueryPaginationMode, EApiControllerGetListQueryUnlistedFields, EApiControllerRelationReferenceShape, EApiControllerRequestTarget, EApiRouteType, EFilterOrderDirection } from "../../../src/index";

import { E2eToManyCursorParentEntity, E2eToManyLedgerEntity, E2eToManyOrderEntity, E2eToManyPostEntity } from "./entity";
import { E2eToManyCursorParentService, E2eToManyLedgerService, E2eToManyOrderService, E2eToManyPostService } from "./service";

const DISABLED_DELETE = { [EApiRouteType.DELETE]: { generation: { isEnabled: false } } } as const;

/**
 * Builds generated routes that load and project the same response relations on every read and write.
 * @param {object} include - Response relation include map.
 * @param {EApiControllerRelationReferenceShape} shape - Response reference shape.
 * @param {string} key - Response reference key.
 * @returns {object} Controller routes.
 */
const buildRoutes = (include: object, shape: EApiControllerRelationReferenceShape, key: string = "id"): object => {
	const relations: object = { response: { load: { include }, reference: { key, shape } } };

	return {
		...DISABLED_DELETE,
		[EApiRouteType.CREATE]: { relations },
		[EApiRouteType.GET]: { relations },
		[EApiRouteType.GET_LIST]: { relations },
		[EApiRouteType.PARTIAL_UPDATE]: { relations },
		[EApiRouteType.UPDATE]: { relations },
	};
};

class E2eToManySecretAuthorDto {
	@Expose()
	public code?: null | string;

	@Expose()
	public id!: string;
}

class E2eToManySecretPostDto {
	@Expose()
	@Type(() => E2eToManySecretAuthorDto)
	public author?: E2eToManySecretAuthorDto;

	@Expose()
	public id!: string;
}

class E2eToManySecretEnvelopeDto {
	@Expose()
	@Type(() => E2eToManySecretPostDto)
	public items!: Array<E2eToManySecretPostDto>;

	@Expose()
	public totalCount!: number;
}

const POST_INCLUDE = { author: true, comments: true, reviews: true, tags: true } as const;
const ORDER_INCLUDE = { items: true, owner: true } as const;
const LEDGER_INCLUDE = { owner: true } as const;

@ApiController<E2eToManyPostEntity>({
	entity: E2eToManyPostEntity,
	name: "E2eToManyObjectPosts",
	path: "to-many-object-posts",
	routes: buildRoutes(POST_INCLUDE, EApiControllerRelationReferenceShape.OBJECT),
} as never)
export class E2eToManyObjectPostController {
	public constructor(@Inject(E2eToManyPostService) public readonly service: E2eToManyPostService) {}

	@ApiRouteCustom<E2eToManyPostEntity>({
		relations: { response: { load: { include: { comments: true, tags: true } }, reference: { key: "id", shape: EApiControllerRelationReferenceShape.OBJECT } } },
		resource: { action: "toMany.customObject", entity: E2eToManyPostEntity },
		response: { status: HttpStatus.OK, type: undefined },
		route: { method: RequestMethod.GET, path: "custom/:id" },
	} as never)
	public async customRead(@Param("id") postId: string): Promise<unknown> {
		return await this.service.get({ where: { id: postId } });
	}
}

@ApiController<E2eToManyPostEntity>({
	entity: E2eToManyPostEntity,
	name: "E2eToManyEnvelopePosts",
	path: "to-many-envelope-posts",
	routes: {
		...DISABLED_DELETE,
		[EApiRouteType.CREATE]: { generation: { isEnabled: false } },
		[EApiRouteType.GET]: { generation: { isEnabled: false } },
		[EApiRouteType.GET_LIST]: { generation: { isEnabled: false } },
		[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
		[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
	},
} as never)
export class E2eToManyEnvelopePostController {
	public constructor(@Inject(E2eToManyPostService) public readonly service: E2eToManyPostService) {}

	@ApiRouteCustom<E2eToManyPostEntity>({
		relations: { response: { load: { include: { author: true } }, reference: { key: "id", shape: EApiControllerRelationReferenceShape.OBJECT } } },
		resource: { action: "toMany.envelopeUndeclared", entity: E2eToManyPostEntity },
		response: { serialization: { isEnabled: true }, status: HttpStatus.OK, type: E2eToManySecretEnvelopeDto },
		route: { method: RequestMethod.GET, path: "undeclared" },
	} as never)
	public async undeclared(): Promise<unknown> {
		const items: Array<E2eToManyPostEntity> = await this.service.repository.find({ order: { title: "ASC" } });

		return { items, totalCount: items.length };
	}

	@ApiRouteCustom<E2eToManyPostEntity>({
		relations: { response: { load: { include: { author: true } }, reference: { key: "id", shape: EApiControllerRelationReferenceShape.OBJECT } } },
		resource: { action: "toMany.envelopeDeclaredList", entity: E2eToManyPostEntity },
		response: { serialization: { isEnabled: true }, status: HttpStatus.OK, type: E2eToManySecretEnvelopeDto },
		route: { method: RequestMethod.GET, path: "declared-list", type: EApiRouteType.GET_LIST },
	} as never)
	public async declaredList(): Promise<unknown> {
		const items: Array<E2eToManyPostEntity> = await this.service.repository.find({ order: { title: "ASC" } });

		return { items, totalCount: items.length };
	}

	@ApiRouteCustom<E2eToManyPostEntity>({
		relations: { response: { load: { include: { author: true } }, reference: { key: "id", shape: EApiControllerRelationReferenceShape.OBJECT } } },
		resource: { action: "toMany.envelopeDeclaredEntity", entity: E2eToManyPostEntity },
		response: { status: HttpStatus.OK, type: undefined },
		route: { method: RequestMethod.GET, path: "declared-entity", type: EApiRouteType.GET },
	} as never)
	public declaredEntity(): unknown {
		return { author: { code: "top-level-secret", id: "top-level" }, items: [{ author: { code: "nested-kept", id: "nested" } }] };
	}
}

@ApiController<E2eToManyPostEntity>({
	entity: E2eToManyPostEntity,
	name: "E2eToManyScalarPosts",
	path: "to-many-scalar-posts",
	routes: buildRoutes(POST_INCLUDE, EApiControllerRelationReferenceShape.SCALAR),
} as never)
export class E2eToManyScalarPostController {
	public constructor(@Inject(E2eToManyPostService) public readonly service: E2eToManyPostService) {}

	@ApiRouteCustom<E2eToManyPostEntity>({
		relations: { response: { load: { include: { comments: true, tags: true } }, reference: { key: "id", shape: EApiControllerRelationReferenceShape.SCALAR } } },
		resource: { action: "toMany.customScalar", entity: E2eToManyPostEntity },
		response: { status: HttpStatus.OK, type: undefined },
		route: { method: RequestMethod.GET, path: "custom/:id" },
	} as never)
	public async customRead(@Param("id") postId: string): Promise<unknown> {
		return await this.service.get({ where: { id: postId } });
	}
}

@ApiController<E2eToManyPostEntity>({
	entity: E2eToManyPostEntity,
	name: "E2eToManyObjectCodePosts",
	path: "to-many-object-code-posts",
	routes: {
		...DISABLED_DELETE,
		[EApiRouteType.CREATE]: { generation: { isEnabled: false } },
		[EApiRouteType.GET]: { relations: { response: { load: { include: { author: true, tags: true } }, reference: { key: "code", shape: EApiControllerRelationReferenceShape.OBJECT } } } },
		[EApiRouteType.GET_LIST]: { generation: { isEnabled: false } },
		[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
		[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
	},
} as never)
export class E2eToManyObjectCodePostController {
	public constructor(@Inject(E2eToManyPostService) public readonly service: E2eToManyPostService) {}
}

@ApiController<E2eToManyOrderEntity>({
	entity: E2eToManyOrderEntity,
	name: "E2eToManyObjectOrders",
	path: "to-many-object-orders",
	routes: buildRoutes(ORDER_INCLUDE, EApiControllerRelationReferenceShape.OBJECT),
} as never)
export class E2eToManyObjectOrderController {
	public constructor(@Inject(E2eToManyOrderService) public readonly service: E2eToManyOrderService) {}

	@ApiRouteCustom<E2eToManyOrderEntity>({
		relations: { response: { load: { include: ORDER_INCLUDE }, reference: { key: "id", shape: EApiControllerRelationReferenceShape.OBJECT } } },
		resource: { action: "toMany.customOrder", entity: E2eToManyOrderEntity },
		response: { status: HttpStatus.OK, type: undefined },
		route: { method: RequestMethod.GET, path: "custom/:id" },
	} as never)
	public async customRead(@Param("id") orderId: string): Promise<unknown> {
		return await this.service.get({ where: { id: orderId } });
	}

	@ApiRouteCustom<E2eToManyOrderEntity>({
		relations: { response: { load: { include: ORDER_INCLUDE }, reference: { key: "id", shape: EApiControllerRelationReferenceShape.OBJECT } } },
		resource: { action: "toMany.customOrderList", entity: E2eToManyOrderEntity },
		response: { status: HttpStatus.OK, type: undefined },
		route: { method: RequestMethod.GET, path: "custom-list", type: EApiRouteType.GET_LIST },
	} as never)
	public async customList(): Promise<unknown> {
		const items: Array<E2eToManyOrderEntity> = await this.service.repository.find({ order: { title: "ASC" } });

		return { items, totalCount: items.length };
	}
}

@ApiController<E2eToManyOrderEntity>({
	entity: E2eToManyOrderEntity,
	name: "E2eToManyScalarOrders",
	path: "to-many-scalar-orders",
	routes: buildRoutes(ORDER_INCLUDE, EApiControllerRelationReferenceShape.SCALAR),
} as never)
export class E2eToManyScalarOrderController {
	public constructor(@Inject(E2eToManyOrderService) public readonly service: E2eToManyOrderService) {}
}

@ApiController<E2eToManyLedgerEntity>({
	entity: E2eToManyLedgerEntity,
	name: "E2eToManyObjectLedgers",
	path: "to-many-object-ledgers",
	routes: buildRoutes(LEDGER_INCLUDE, EApiControllerRelationReferenceShape.OBJECT),
} as never)
export class E2eToManyObjectLedgerController {
	public constructor(@Inject(E2eToManyLedgerService) public readonly service: E2eToManyLedgerService) {}

	@ApiRouteCustom<E2eToManyLedgerEntity>({
		relations: { response: { load: { include: LEDGER_INCLUDE }, reference: { key: "id", shape: EApiControllerRelationReferenceShape.OBJECT } } },
		resource: { action: "toMany.customLedger", entity: E2eToManyLedgerEntity },
		response: { status: HttpStatus.OK, type: undefined },
		route: { method: RequestMethod.GET, path: "custom/:id" },
	} as never)
	public async customRead(@Param("id") ledgerId: string): Promise<unknown> {
		return await this.service.get({ where: { id: ledgerId } });
	}
}

@ApiController<E2eToManyLedgerEntity>({
	entity: E2eToManyLedgerEntity,
	name: "E2eToManyScalarLedgers",
	path: "to-many-scalar-ledgers",
	routes: buildRoutes(LEDGER_INCLUDE, EApiControllerRelationReferenceShape.SCALAR),
} as never)
export class E2eToManyScalarLedgerController {
	public constructor(@Inject(E2eToManyLedgerService) public readonly service: E2eToManyLedgerService) {}
}

@ApiController<E2eToManyCursorParentEntity>({
	entity: E2eToManyCursorParentEntity,
	name: "E2eToManyCursorParents",
	path: "to-many-cursor-parents",
	routes: {
		...DISABLED_DELETE,
		[EApiRouteType.CREATE]: { generation: { isEnabled: false } },
		[EApiRouteType.GET]: { generation: { isEnabled: false } },
		[EApiRouteType.GET_LIST]: {
			relations: { response: { load: { include: { children: true } }, reference: { key: "id", shape: EApiControllerRelationReferenceShape.OBJECT } } },
			request: {
				[EApiControllerRequestTarget.QUERY]: {
					order: {
						defaultOrder: [{ direction: EFilterOrderDirection.ASC, field: "rank" }],
						fields: { rank: { isEnabled: true } },
						tieBreakers: [{ direction: EFilterOrderDirection.ASC, field: "id" }],
						unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
					},
					pagination: { mode: EApiControllerGetListQueryPaginationMode.CURSOR },
				},
			},
		},
		[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
		[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
	},
} as never)
export class E2eToManyCursorParentController {
	public constructor(@Inject(E2eToManyCursorParentService) public readonly service: E2eToManyCursorParentService) {}
}
