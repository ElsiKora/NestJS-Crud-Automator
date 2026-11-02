import "reflect-metadata";

import type { Relation, Repository } from "typeorm";

import { Injectable, Module, UnprocessableEntityException } from "@nestjs/common";
import { InjectRepository, TypeOrmModule } from "@nestjs/typeorm";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";

import { ApiController, ApiControllerObservable, ApiPropertyDescribe, ApiRouteSubscriber, ApiRouteSubscriberBase, ApiService, ApiServiceBase, EApiControllerRelationReferenceShape, EApiControllerRequestTarget, EApiControllerRequestTransformerType, EApiDtoType, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType, EErrorStringAction } from "../../../src/index";

export const SINGLE_TENANT_PINNED: string = "T1";
export const SINGLE_TENANT_OTHER: string = "T2";

const TEXT_PROPERTY: Parameters<typeof ApiPropertyDescribe>[0] = { description: "text", exampleValue: "value", format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING };
const UUID_PROPERTY: Parameters<typeof ApiPropertyDescribe>[0] = { description: "id", type: EApiPropertyDescribeType.UUID };
const RELATION_PROPERTY: Parameters<typeof ApiPropertyDescribe>[0] = { description: "tenant", type: EApiPropertyDescribeType.RELATION };

@Entity("row_path_single_tenants")
export class RowPathSingleTenantEntity {
	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe(TEXT_PROPERTY)
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe(TEXT_PROPERTY)
	public name!: string;
}

// A tenant column the entity declares, which a relation over that one column also joins.
@Entity("row_path_single_children")
export class RowPathSingleChildEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe(UUID_PROPERTY)
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe(TEXT_PROPERTY)
	public name!: string;

	@ApiPropertyDescribe(RELATION_PROPERTY)
	@JoinColumn({ name: "tenantId" })
	@ManyToOne(() => RowPathSingleTenantEntity, { nullable: false })
	public tenant?: Relation<RowPathSingleTenantEntity>;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe(TEXT_PROPERTY)
	public tenantId!: string;
}

// The same relation, whose one column is a key column.
@Entity("row_path_single_key_children")
export class RowPathSingleKeyChildEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe(UUID_PROPERTY)
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe(TEXT_PROPERTY)
	public name!: string;

	@ApiPropertyDescribe(RELATION_PROPERTY)
	@JoinColumn({ name: "tenantId" })
	@ManyToOne(() => RowPathSingleTenantEntity, { nullable: false })
	public tenant?: Relation<RowPathSingleTenantEntity>;

	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe(TEXT_PROPERTY)
	public tenantId!: string;
}

// The owner is server-managed: no generated body publishes the relation or its column.
const HIDDEN_PROPERTIES = { properties: { [EApiRouteType.CREATE]: { [EApiDtoType.BODY]: { isEnabled: false } }, [EApiRouteType.PARTIAL_UPDATE]: { [EApiDtoType.BODY]: { isEnabled: false } }, [EApiRouteType.UPDATE]: { [EApiDtoType.BODY]: { isEnabled: false } } } };

@Entity("row_path_single_owned")
export class RowPathSingleOwnedEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe(UUID_PROPERTY)
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe(TEXT_PROPERTY)
	public name!: string;

	@ApiPropertyDescribe({ ...RELATION_PROPERTY, ...HIDDEN_PROPERTIES } as Parameters<typeof ApiPropertyDescribe>[0])
	@JoinColumn({ name: "ownerId" })
	@ManyToOne(() => RowPathSingleTenantEntity, { nullable: true })
	public owner?: null | Relation<RowPathSingleTenantEntity>;

	@Column({ nullable: true, type: "varchar" })
	@ApiPropertyDescribe({ ...TEXT_PROPERTY, isNullable: true, ...HIDDEN_PROPERTIES } as Parameters<typeof ApiPropertyDescribe>[0])
	public ownerId!: null | string;
}

// A relation whose cascade writes the related row the body describes.
@Entity("row_path_single_cascaded")
export class RowPathSingleCascadedEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe(UUID_PROPERTY)
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe(TEXT_PROPERTY)
	public name!: string;

	@ApiPropertyDescribe(RELATION_PROPERTY)
	@JoinColumn({ name: "tenantId" })
	@ManyToOne(() => RowPathSingleTenantEntity, { cascade: ["insert", "update"], nullable: true })
	public tenant?: null | Relation<RowPathSingleTenantEntity>;

	@Column({ nullable: true, type: "varchar" })
	@ApiPropertyDescribe({ ...TEXT_PROPERTY, isNullable: true } as Parameters<typeof ApiPropertyDescribe>[0])
	public tenantId!: null | string;
}

@Injectable()
@ApiService<RowPathSingleOwnedEntity>({ entity: RowPathSingleOwnedEntity })
class RowPathSingleOwnedService extends ApiServiceBase<RowPathSingleOwnedEntity> {
	constructor(@InjectRepository(RowPathSingleOwnedEntity) public readonly repository: Repository<RowPathSingleOwnedEntity>) {
		super();
	}
}

@Injectable()
@ApiService<RowPathSingleCascadedEntity>({ entity: RowPathSingleCascadedEntity })
class RowPathSingleCascadedService extends ApiServiceBase<RowPathSingleCascadedEntity> {
	constructor(@InjectRepository(RowPathSingleCascadedEntity) public readonly repository: Repository<RowPathSingleCascadedEntity>) {
		super();
	}
}

// The server removes whatever owner the client sent, before the route writes the body.
@Injectable()
@ApiRouteSubscriber({ entity: RowPathSingleOwnedEntity })
class RowPathSingleOwnedSubscriber extends ApiRouteSubscriberBase<RowPathSingleOwnedEntity> {
	public async onBeforeCreate(context: never): Promise<never> {
		const result: { body?: Record<string, unknown> } = (context as { result: { body?: Record<string, unknown> } }).result;

		if (result.body) {
			Reflect.deleteProperty(result.body, "owner");
			Reflect.deleteProperty(result.body, "ownerId");
		}

		return await Promise.resolve(result as never);
	}
}

@ApiControllerObservable()
@ApiController<RowPathSingleOwnedEntity>({ entity: RowPathSingleOwnedEntity, path: "single-owned", routes: {} })
class RowPathSingleOwnedController {
	constructor(public readonly service: RowPathSingleOwnedService) {}
}

@ApiController<RowPathSingleCascadedEntity>({ entity: RowPathSingleCascadedEntity, path: "single-cascaded", routes: {} })
class RowPathSingleCascadedController {
	constructor(public readonly service: RowPathSingleCascadedService) {}
}

@Injectable()
@ApiService<RowPathSingleChildEntity>({ entity: RowPathSingleChildEntity })
class RowPathSingleChildService extends ApiServiceBase<RowPathSingleChildEntity> {
	constructor(@InjectRepository(RowPathSingleChildEntity) public readonly repository: Repository<RowPathSingleChildEntity>) {
		super();
	}
}

@Injectable()
@ApiService<RowPathSingleTenantEntity>({ entity: RowPathSingleTenantEntity })
class RowPathSingleTenantService extends ApiServiceBase<RowPathSingleTenantEntity> {
	constructor(@InjectRepository(RowPathSingleTenantEntity) public readonly repository: Repository<RowPathSingleTenantEntity>) {
		super();
	}
}

@Injectable()
@ApiService<RowPathSingleKeyChildEntity>({ entity: RowPathSingleKeyChildEntity })
class RowPathSingleKeyChildService extends ApiServiceBase<RowPathSingleKeyChildEntity> {
	constructor(@InjectRepository(RowPathSingleKeyChildEntity) public readonly repository: Repository<RowPathSingleKeyChildEntity>) {
		super();
	}
}

const PINNED_ROUTE = { request: { [EApiControllerRequestTarget.BODY]: { transformers: [{ key: "tenantId", shouldSetValueEvenIfMissing: true, type: EApiControllerRequestTransformerType.STATIC, value: SINGLE_TENANT_PINNED }] } } } as const;
const PINNED_ROUTES = { [EApiRouteType.CREATE]: PINNED_ROUTE, [EApiRouteType.PARTIAL_UPDATE]: PINNED_ROUTE, [EApiRouteType.UPDATE]: PINNED_ROUTE } as never;

@ApiController<RowPathSingleChildEntity>({ entity: RowPathSingleChildEntity, path: "single-pinned", routes: PINNED_ROUTES })
class RowPathSinglePinnedController {
	constructor(public readonly service: RowPathSingleChildService) {}
}

@ApiController<RowPathSingleChildEntity>({ entity: RowPathSingleChildEntity, path: "single-plain", routes: {} })
class RowPathSinglePlainController {
	constructor(public readonly service: RowPathSingleChildService) {}
}

@ApiController<RowPathSingleKeyChildEntity>({ entity: RowPathSingleKeyChildEntity, path: "single-key-pinned", routes: PINNED_ROUTES })
class RowPathSingleKeyPinnedController {
	constructor(public readonly service: RowPathSingleKeyChildService) {}
}

@ApiController<RowPathSingleKeyChildEntity>({ entity: RowPathSingleKeyChildEntity, path: "single-key-plain", routes: {} })
class RowPathSingleKeyPlainController {
	constructor(public readonly service: RowPathSingleKeyChildService) {}
}

// Request relation loading reads the relation after the split, so a tenant that does not exist still answers 404 before the insert.
const LOADED_ROUTE = { relations: { request: { load: { include: { tenant: true } }, reference: { shape: EApiControllerRelationReferenceShape.SCALAR } } } } as never;

@ApiController<RowPathSingleChildEntity>({ entity: RowPathSingleChildEntity, path: "single-loaded", routes: { [EApiRouteType.CREATE]: LOADED_ROUTE, [EApiRouteType.PARTIAL_UPDATE]: LOADED_ROUTE } })
class RowPathSingleLoadedController {
	constructor(
		public readonly service: RowPathSingleChildService,
		public readonly tenantService: RowPathSingleTenantService,
	) {}
}

// A path validator that always refuses, so its status must be declared on CREATE, which runs it under pathScope.
const PATH_VALIDATED_ROUTE = { request: { [EApiControllerRequestTarget.PARAMETERS]: { validators: [{ errorType: EErrorStringAction.VALIDATION_ERROR, exception: UnprocessableEntityException, validationFunction: (): boolean => false }] } } } as never;

@ApiController<RowPathSingleChildEntity>({
	entity: RowPathSingleChildEntity,
	path: "tenant/:tenantId/single",
	pathScope: { parameters: [{ field: "tenantId", parameter: "tenantId" }] },
	routes: { [EApiRouteType.CREATE]: PATH_VALIDATED_ROUTE, [EApiRouteType.DELETE]: PATH_VALIDATED_ROUTE, [EApiRouteType.GET_LIST]: PATH_VALIDATED_ROUTE, [EApiRouteType.PARTIAL_UPDATE]: PATH_VALIDATED_ROUTE, [EApiRouteType.UPDATE]: PATH_VALIDATED_ROUTE },
})
class RowPathSingleScopedController {
	constructor(public readonly service: RowPathSingleChildService) {}
}

export const ROW_PATH_SINGLE_ENTITIES: Array<new () => object> = [RowPathSingleCascadedEntity, RowPathSingleChildEntity, RowPathSingleKeyChildEntity, RowPathSingleOwnedEntity, RowPathSingleTenantEntity];

@Module({
	controllers: [RowPathSingleCascadedController, RowPathSingleKeyPinnedController, RowPathSingleKeyPlainController, RowPathSingleLoadedController, RowPathSingleOwnedController, RowPathSinglePinnedController, RowPathSinglePlainController, RowPathSingleScopedController],
	imports: [TypeOrmModule.forFeature(ROW_PATH_SINGLE_ENTITIES)],
	providers: [RowPathSingleCascadedService, RowPathSingleChildService, RowPathSingleKeyChildService, RowPathSingleOwnedService, RowPathSingleOwnedSubscriber, RowPathSingleTenantService],
})
export class RowPathSingleModule {}
