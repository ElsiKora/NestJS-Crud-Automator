import "reflect-metadata";

import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiControllerPropertiesRouteBaseRelationsRequest } from "@interface/decorator/api";

import { ApiServiceBase } from "@class/api";
import { ApiController } from "@decorator/api/controller/decorator";
import { ApiPropertyDescribe } from "@decorator/api/property/describe.decorator";
import { ApiRouteCustom } from "@decorator/api/route-custom.decorator";
import { EApiControllerRelationReferenceShape, EApiFunctionTransactionMode, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "@enum/decorator/api";
import { HttpStatus, RequestMethod } from "@nestjs/common";
import { ChildEntity, Column, Entity, ManyToOne, PrimaryGeneratedColumn, TableInheritance } from "typeorm";
import { describe, expect, it } from "vitest";

@Entity("request_relation_owners")
class RequestRelationOwnerEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;
}

abstract class RequestRelationAuditedEntity {
	@ManyToOne(() => RequestRelationOwnerEntity, { nullable: true })
	@ApiPropertyDescribe({ description: "auditor", type: EApiPropertyDescribeType.RELATION })
	public auditor!: RequestRelationOwnerEntity;
}

@Entity("request_relation_roots")
@TableInheritance({ column: { name: "type", type: "varchar" } })
class RequestRelationRootEntity extends RequestRelationAuditedEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@ManyToOne(() => RequestRelationOwnerEntity, { nullable: true })
	@ApiPropertyDescribe({ description: "owner", type: EApiPropertyDescribeType.RELATION })
	public owner!: RequestRelationOwnerEntity;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "type",
		exampleValue: "CARD",
		format: EApiPropertyStringType.STRING,
		maxLength: 64,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public type!: string;
}

@ChildEntity("CARD")
class RequestRelationCardEntity extends RequestRelationRootEntity {
	@ManyToOne(() => RequestRelationOwnerEntity, { nullable: true })
	@ApiPropertyDescribe({ description: "issuer", type: EApiPropertyDescribeType.RELATION })
	public issuer!: RequestRelationOwnerEntity;
}

@ChildEntity("TRANSFER")
class RequestRelationTransferEntity extends RequestRelationRootEntity {}

@ChildEntity("BANK")
class RequestRelationBankEntity extends RequestRelationTransferEntity {
	@ManyToOne(() => RequestRelationOwnerEntity, { nullable: true })
	@ApiPropertyDescribe({ description: "bank", type: EApiPropertyDescribeType.RELATION })
	public bank!: RequestRelationOwnerEntity;
}

abstract class RequestRelationSharedChildColumns extends RequestRelationRootEntity {
	@ManyToOne(() => RequestRelationOwnerEntity, { nullable: true })
	@ApiPropertyDescribe({ description: "shared", type: EApiPropertyDescribeType.RELATION })
	public shared!: RequestRelationOwnerEntity;
}

@ChildEntity("SHARED")
class RequestRelationSharedEntity extends RequestRelationSharedChildColumns {}

@Entity("request_relation_regular_subclasses")
class RequestRelationRegularSubclassEntity extends RequestRelationRootEntity {
	@ManyToOne(() => RequestRelationOwnerEntity, { nullable: true })
	@ApiPropertyDescribe({ description: "regular", type: EApiPropertyDescribeType.RELATION })
	public regular!: RequestRelationOwnerEntity;
}

@Entity("request_relation_other_roots")
@TableInheritance({ column: { name: "type", type: "varchar" } })
class RequestRelationOtherRootEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;
}

@ChildEntity("OTHER")
class RequestRelationOtherChildEntity extends RequestRelationOtherRootEntity {
	@ManyToOne(() => RequestRelationOwnerEntity, { nullable: true })
	@ApiPropertyDescribe({ description: "foreign", type: EApiPropertyDescribeType.RELATION })
	public foreign!: RequestRelationOwnerEntity;
}

@Entity("request_relation_plain_entities")
class RequestRelationPlainEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;
}

@Entity("request_relation_plain_subclass_entities")
class RequestRelationPlainSubclassEntity extends RequestRelationPlainEntity {
	@ManyToOne(() => RequestRelationOwnerEntity, { nullable: true })
	@ApiPropertyDescribe({ description: "extra", type: EApiPropertyDescribeType.RELATION })
	public extra!: RequestRelationOwnerEntity;
}

@Entity("request_relation_strangers")
class RequestRelationStrangerEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@ManyToOne(() => RequestRelationOwnerEntity, { nullable: true })
	@ApiPropertyDescribe({ description: "stranger", type: EApiPropertyDescribeType.RELATION })
	public stranger!: RequestRelationOwnerEntity;
}

type TRequestRelationEntity = IApiBaseEntity & Partial<RequestRelationCardEntity> & RequestRelationRootEntity;

const disabledRoute = { generation: { isEnabled: false } } as const;

const CHILD_ONLY_MESSAGE: string = `relations.request key "issuer" is declared only on child entity ${RequestRelationCardEntity.name} of table inheritance root ${RequestRelationRootEntity.name}. Declare the relation on ${RequestRelationRootEntity.name} or use a controller for ${RequestRelationCardEntity.name}.`;

function createRequestRelations(include: Record<string, unknown>, locks?: Record<string, unknown>): IApiControllerPropertiesRouteBaseRelationsRequest<TRequestRelationEntity> {
	return { load: { include, locks }, reference: { shape: EApiControllerRelationReferenceShape.SCALAR } } as never;
}

function decorateController(request: IApiControllerPropertiesRouteBaseRelationsRequest<TRequestRelationEntity>, method: EApiRouteType = EApiRouteType.CREATE, entity: unknown = RequestRelationRootEntity, transactionMode?: EApiFunctionTransactionMode): void {
	class RequestRelationController {
		public readonly service!: ApiServiceBase<TRequestRelationEntity>;
	}

	ApiController<TRequestRelationEntity>({
		entity: entity as never,
		name: "RequestRelation",
		routes: {
			[EApiRouteType.CREATE]: disabledRoute,
			[EApiRouteType.DELETE]: disabledRoute,
			[EApiRouteType.GET]: disabledRoute,
			[EApiRouteType.GET_LIST]: disabledRoute,
			[EApiRouteType.PARTIAL_UPDATE]: disabledRoute,
			[EApiRouteType.UPDATE]: disabledRoute,
			[method]: { relations: { request }, ...(transactionMode ? { transaction: { mode: transactionMode } } : {}) },
		},
	})(RequestRelationController);
}

describe("ApiController request relations on a table inheritance root", () => {
	it("accepts keys declared on the root and on its parent classes", () => {
		expect(() => decorateController(createRequestRelations({ auditor: true, owner: true }, { owner: { mode: "pessimistic_write" } }))).not.toThrow();
	});

	it("fails decoration for a key declared only on a child entity, on every route", () => {
		for (const method of Object.values(EApiRouteType)) {
			expect(() => decorateController(createRequestRelations({ issuer: true, owner: true }), method)).toThrow(`Controller RequestRelationController route ${method} ${CHILD_ONLY_MESSAGE}`);
		}
	});

	it("fails decoration for a child-only key in locks", () => {
		expect(() => decorateController(createRequestRelations({ owner: true }, { issuer: { mode: "pessimistic_write" } }))).toThrow(`Controller RequestRelationController route ${EApiRouteType.CREATE} ${CHILD_ONLY_MESSAGE}`);
	});

	it("fails decoration for a key that is not a relation anywhere in the hierarchy", () => {
		expect(() => decorateController(createRequestRelations({ missing: true }))).toThrow(`Controller RequestRelationController route ${EApiRouteType.CREATE} relations.request key "missing" is not a relation on ${RequestRelationRootEntity.name} or its parent classes`);
	});

	it("fails decoration on every route of an entity outside table inheritance", () => {
		for (const method of Object.values(EApiRouteType)) {
			expect(() => decorateController(createRequestRelations({ missing: true }), method, RequestRelationPlainEntity)).toThrow(`Controller RequestRelationController route ${method} relations.request key "missing" is not a relation on ${RequestRelationPlainEntity.name} or its parent classes`);
		}
	});

	it("uses the child entity wording only for a real child entity of a table inheritance root", () => {
		expect(RequestRelationPlainSubclassEntity).toBeDefined();
		expect(RequestRelationStrangerEntity).toBeDefined();
		expect(() => decorateController(createRequestRelations({ extra: true }), EApiRouteType.CREATE, RequestRelationPlainEntity)).toThrow(`relations.request key "extra" is not a relation on ${RequestRelationPlainEntity.name} or its parent classes`);
		expect(() => decorateController(createRequestRelations({ stranger: true }))).toThrow(`relations.request key "stranger" is not a relation on ${RequestRelationRootEntity.name} or its parent classes`);
		expect(() => decorateController(createRequestRelations({ issuer: true }), EApiRouteType.CREATE, RequestRelationCardEntity)).not.toThrow();

		expect(RequestRelationOtherChildEntity).toBeDefined();
		expect(() => decorateController(createRequestRelations({ foreign: true }))).toThrow(`relations.request key "foreign" is not a relation on ${RequestRelationRootEntity.name} or its parent classes`);

		expect(RequestRelationRegularSubclassEntity).toBeDefined();
		expect(() => decorateController(createRequestRelations({ regular: true }))).toThrow(`relations.request key "regular" is not a relation on ${RequestRelationRootEntity.name} or its parent classes`);

		expect(RequestRelationBankEntity).toBeDefined();
		expect(() => decorateController(createRequestRelations({ bank: true }), EApiRouteType.CREATE, RequestRelationTransferEntity)).toThrow(`relations.request key "bank" is not a relation on ${RequestRelationTransferEntity.name} or its parent classes`);
		expect(() => decorateController(createRequestRelations({ bank: true }))).toThrow(`relations.request key "bank" is declared only on child entity ${RequestRelationBankEntity.name}`);

		expect(() => decorateController(createRequestRelations({ shared: true }))).toThrow(`relations.request key "shared" is declared only on child entity ${RequestRelationSharedEntity.name}`);
	});

	it("fails decoration for a lock that request time would reject", () => {
		const relationConfig = (include: Record<string, unknown>, locks: Record<string, unknown>) => createRequestRelations(include, locks);

		expect(() => decorateController(relationConfig({ owner: false }, { owner: { mode: "pessimistic_write" } }))).toThrow(`relations.request lock "owner" requires a matching enabled include`);
		expect(() => decorateController(relationConfig({ auditor: true }, { owner: { mode: "pessimistic_write" } }))).toThrow(`relations.request lock "owner" requires a matching enabled include`);
		expect(() => decorateController(relationConfig({ owner: true }, { owner: { mode: "optimistic" } }))).toThrow(`relations.request lock "owner" mode must be pessimistic_read or pessimistic_write`);
		expect(() => decorateController(relationConfig({ owner: { profile: true } }, { owner: { mode: "pessimistic_read" } }))).toThrow(`relations.request lock "owner" with nested relations requires relationLoadStrategy query`);
	});

	it("fails decoration for a lock on a route with transaction mode NONE", () => {
		const locked: IApiControllerPropertiesRouteBaseRelationsRequest<TRequestRelationEntity> = createRequestRelations({ owner: true }, { owner: { mode: "pessimistic_write" } });

		expect(() => decorateController(locked, EApiRouteType.CREATE, RequestRelationRootEntity, EApiFunctionTransactionMode.NONE)).toThrow(`Controller RequestRelationController route create relations.request.load.locks cannot be used with transaction mode NONE, because a lock needs an active transaction`);
	});

	it("keeps a lock on the other transaction modes, and mode NONE without a lock, passing decoration", () => {
		const locked: IApiControllerPropertiesRouteBaseRelationsRequest<TRequestRelationEntity> = createRequestRelations({ owner: true }, { owner: { mode: "pessimistic_write" } });

		for (const mode of [EApiFunctionTransactionMode.MANDATORY, EApiFunctionTransactionMode.REQUIRED, EApiFunctionTransactionMode.SUPPORTS]) {
			expect(() => decorateController(locked, EApiRouteType.CREATE, RequestRelationRootEntity, mode)).not.toThrow();
		}

		expect(() => decorateController(createRequestRelations({ owner: true }), EApiRouteType.CREATE, RequestRelationRootEntity, EApiFunctionTransactionMode.NONE)).not.toThrow();
		expect(() => decorateController(createRequestRelations({ owner: true }, {}), EApiRouteType.CREATE, RequestRelationRootEntity, EApiFunctionTransactionMode.NONE)).not.toThrow();
	});

	it("ignores request relations of a route whose generation is disabled", () => {
		class RequestRelationDisabledController {
			public readonly service!: ApiServiceBase<TRequestRelationEntity>;
		}

		expect(() =>
			ApiController<TRequestRelationEntity>({
				entity: RequestRelationRootEntity as never,
				routes: { [EApiRouteType.CREATE]: { generation: { isEnabled: false }, relations: { request: createRequestRelations({ issuer: true }) } } },
			})(RequestRelationDisabledController),
		).not.toThrow();
	});

	it("fails decoration of a custom route with a child-only key", () => {
		class RequestRelationCustomController {
			public handler(): void {}
		}

		const descriptor: PropertyDescriptor = Object.getOwnPropertyDescriptor(RequestRelationCustomController.prototype, "handler") as PropertyDescriptor;

		expect(() =>
			ApiRouteCustom<TRequestRelationEntity>({
				relations: { request: createRequestRelations({ issuer: true }) },
				resource: { action: "custom.create", entity: RequestRelationRootEntity as never },
				response: { status: HttpStatus.NO_CONTENT, type: undefined },
				route: { method: RequestMethod.POST, path: "custom" },
			})(RequestRelationCustomController.prototype, "handler", descriptor),
		).toThrow(`Custom route RequestRelationCustomController.handler ${CHILD_ONLY_MESSAGE}`);
	});
});
