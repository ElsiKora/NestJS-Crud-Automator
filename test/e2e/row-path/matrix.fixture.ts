import "reflect-metadata";

import type { CanActivate, ExecutionContext, Type } from "@nestjs/common";
import type { Relation, Repository } from "typeorm";

import { Get, HttpStatus, Inject, Injectable, Param, RequestMethod } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsUUID } from "class-validator";
import { ChildEntity, Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryColumn, PrimaryGeneratedColumn, TableInheritance } from "typeorm";

import type { IApiAuthorizationPrincipal, IApiControllerAuthorizationProperties, IApiPolicyAttachmentSource, IApiPolicyDocumentRecord, IApiPolicyDocumentSource } from "../../../src/index";

import {
	ApiAuthorizationPolicy,
	ApiAuthorizationPolicyBase,
	ApiController,
	ApiControllerObservable,
	ApiControllerSecurable,
	ApiFunctionSubscriber,
	ApiFunctionSubscriberBase,
	ApiPropertyDescribe,
	ApiRouteCustom,
	ApiRouteSubscriber,
	ApiRouteSubscriberBase,
	ApiService,
	ApiServiceBase,
	ApiServiceObservable,
	EApiAuthenticationType,
	EApiAuthorizationMode,
	EApiControllerGetListQueryPaginationMode,
	EApiControllerGetListQueryUnlistedFields,
	EApiControllerRelationReferenceShape,
	EApiControllerRequestTarget,
	EApiDtoType,
	EApiFunctionTransactionMode,
	EApiFunctionType,
	EApiPolicyEffect,
	EApiPolicySourceType,
	EApiPropertyDescribeType,
	EApiPropertyStringType,
	EApiRouteType,
	EFilterOrderDirection,
} from "../../../src/index";

const TEXT_PROPERTY: Parameters<typeof ApiPropertyDescribe>[0] = { description: "text", exampleValue: "value", format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING };
const UUID_PROPERTY: Parameters<typeof ApiPropertyDescribe>[0] = { description: "id", type: EApiPropertyDescribeType.UUID };
const RELATION_PROPERTY: Parameters<typeof ApiPropertyDescribe>[0] = { description: "relation", type: EApiPropertyDescribeType.RELATION };

const DISABLED_ROUTE = { generation: { isEnabled: false } } as const;
const ORDER_REQUEST = { [EApiControllerRequestTarget.QUERY]: { order: { defaultOrder: [{ direction: EFilterOrderDirection.ASC, field: "name" }], fields: {}, tieBreakers: [{ direction: EFilterOrderDirection.ASC, field: "id" }], unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT } } } as const;
const CURSOR_REQUEST = {
	[EApiControllerRequestTarget.QUERY]: {
		order: {
			fields: {},
			tieBreakers: [
				{ direction: EFilterOrderDirection.ASC, field: "tenantId" },
				{ direction: EFilterOrderDirection.ASC, field: "id" },
			],
			unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
		},
		pagination: { mode: EApiControllerGetListQueryPaginationMode.CURSOR },
	},
} as const;
const TENANT_SCOPE = { parameters: [{ field: "tenantId", parameter: "tenantId" }] } as const;
const SECURITY = { authentication: { guard: undefined as unknown as Type<CanActivate>, type: EApiAuthenticationType.USER } };

export const ROW_PATH_IAM_POLICY_ID: string = "row-path-order-policy";
export const ROW_PATH_ORDER_RESPONSE_RELATIONS = { response: { load: { include: { customer: true, lines: true, notes: true } }, reference: { key: "id", shape: EApiControllerRelationReferenceShape.OBJECT } } } as const;

@Entity("row_path_matrix_customers")
export class RowPathCustomerEntity {
	@PrimaryColumn({ type: "uuid" })
	@ApiPropertyDescribe(UUID_PROPERTY)
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe(TEXT_PROPERTY)
	public name!: string;
}

@Entity("row_path_matrix_orders")
export class RowPathOrderEntity {
	@PrimaryColumn({ type: "uuid" })
	@ApiPropertyDescribe(UUID_PROPERTY)
	public tenantId!: string;

	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe(UUID_PROPERTY)
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe(TEXT_PROPERTY)
	public name!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe(TEXT_PROPERTY)
	public ownerId!: string;

	@ApiPropertyDescribe(RELATION_PROPERTY)
	@ManyToOne(() => RowPathCustomerEntity, { eager: true, nullable: true })
	public customer?: null | Relation<RowPathCustomerEntity>;

	@ApiPropertyDescribe(RELATION_PROPERTY)
	@OneToMany(() => RowPathLineEntity, (line: RowPathLineEntity): null | Relation<RowPathOrderEntity> | undefined => line.order, { eager: true })
	public lines?: Array<Relation<RowPathLineEntity>>;

	@ApiPropertyDescribe(RELATION_PROPERTY)
	@OneToMany(() => RowPathNoteEntity, (note: RowPathNoteEntity): null | Relation<RowPathOrderEntity> | undefined => note.order)
	public notes?: Array<Relation<RowPathNoteEntity>>;
}

@Entity("row_path_matrix_lines")
export class RowPathLineEntity {
	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe(TEXT_PROPERTY)
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe(TEXT_PROPERTY)
	public label!: string;

	@JoinColumn([
		{ name: "orderTenantId", referencedColumnName: "tenantId" },
		{ name: "orderId", referencedColumnName: "id" },
	])
	@ManyToOne(() => RowPathOrderEntity, (order: RowPathOrderEntity): Array<RowPathLineEntity> | undefined => order.lines, { nullable: true, onDelete: "CASCADE" })
	public order?: null | Relation<RowPathOrderEntity>;
}

@Entity("row_path_matrix_notes")
export class RowPathNoteEntity {
	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe(TEXT_PROPERTY)
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe(TEXT_PROPERTY)
	public text!: string;

	@JoinColumn([
		{ name: "orderTenantId", referencedColumnName: "tenantId" },
		{ name: "orderId", referencedColumnName: "id" },
	])
	@ManyToOne(() => RowPathOrderEntity, (order: RowPathOrderEntity): Array<RowPathNoteEntity> | undefined => order.notes, { nullable: true, onDelete: "CASCADE" })
	public order?: null | Relation<RowPathOrderEntity>;
}

@Entity("row_path_matrix_assets")
export class RowPathAssetEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe(UUID_PROPERTY)
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe(TEXT_PROPERTY)
	public name!: string;

	@Column({ type: "uuid" })
	@ApiPropertyDescribe(UUID_PROPERTY)
	public ownerId!: string;

	@ApiPropertyDescribe(RELATION_PROPERTY)
	@JoinColumn({ name: "ownerId" })
	@ManyToOne(() => RowPathCustomerEntity, { nullable: false })
	public owner?: Relation<RowPathCustomerEntity>;
}

export enum ERowPathShapeKind {
	CIRCLE = "CIRCLE",
	SQUARE = "SQUARE",
}

@Entity("row_path_matrix_shapes")
@TableInheritance({ column: { name: "kind", type: "varchar" } })
export class RowPathShapeEntity {
	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe(TEXT_PROPERTY)
	public groupId!: string;

	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe(TEXT_PROPERTY)
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({ description: "kind", enum: ERowPathShapeKind, enumName: "ERowPathShapeKind", type: EApiPropertyDescribeType.ENUM })
	public kind!: ERowPathShapeKind;
}

@ChildEntity(ERowPathShapeKind.CIRCLE)
export class RowPathCircleEntity extends RowPathShapeEntity {
	@Column({ nullable: true, type: "varchar" })
	@ApiPropertyDescribe(TEXT_PROPERTY)
	public radius!: string;
}

@ChildEntity(ERowPathShapeKind.SQUARE)
export class RowPathSquareEntity extends RowPathShapeEntity {
	@Column({ nullable: true, type: "varchar" })
	@ApiPropertyDescribe(TEXT_PROPERTY)
	public side!: string;
}

@Injectable()
export class RowPathGuard implements CanActivate {
	public canActivate(context: ExecutionContext): boolean {
		const request: { headers: Record<string, string | undefined>; user?: unknown } = context.switchToHttp().getRequest();
		const ownerId: string | undefined = request.headers["x-owner-id"];

		if (!ownerId) {
			return false;
		}

		request.user = { id: ownerId, ownerId };

		return true;
	}
}

SECURITY.authentication.guard = RowPathGuard;

@Injectable()
@ApiService({ entity: RowPathCustomerEntity })
export class RowPathCustomerService extends ApiServiceBase<RowPathCustomerEntity> {
	@InjectRepository(RowPathCustomerEntity)
	public readonly repository!: Repository<RowPathCustomerEntity>;
}

@Injectable()
@ApiService({ entity: RowPathOrderEntity })
@ApiServiceObservable()
export class RowPathOrderService extends ApiServiceBase<RowPathOrderEntity> {
	@InjectRepository(RowPathOrderEntity)
	public readonly repository!: Repository<RowPathOrderEntity>;
}

@Injectable()
@ApiService({
	entity: RowPathOrderEntity,
	functions: {
		[EApiFunctionType.CREATE]: { transaction: { mode: EApiFunctionTransactionMode.MANDATORY } },
		[EApiFunctionType.DELETE]: { transaction: { mode: EApiFunctionTransactionMode.MANDATORY } },
		[EApiFunctionType.GET]: { transaction: { mode: EApiFunctionTransactionMode.MANDATORY } },
		[EApiFunctionType.UPDATE]: { transaction: { mode: EApiFunctionTransactionMode.MANDATORY } },
	},
})
export class RowPathMandatoryOrderService extends ApiServiceBase<RowPathOrderEntity> {
	@InjectRepository(RowPathOrderEntity)
	public readonly repository!: Repository<RowPathOrderEntity>;
}

@Injectable()
@ApiService({ entity: RowPathAssetEntity })
export class RowPathAssetService extends ApiServiceBase<RowPathAssetEntity> {
	@InjectRepository(RowPathAssetEntity)
	public readonly repository!: Repository<RowPathAssetEntity>;
}

@Injectable()
@ApiService({ entity: RowPathShapeEntity })
export class RowPathShapeService extends ApiServiceBase<RowPathShapeEntity> {
	@InjectRepository(RowPathShapeEntity)
	public readonly repository!: Repository<RowPathShapeEntity>;
}

@Injectable()
@ApiAuthorizationPolicy({ entity: RowPathOrderEntity })
export class RowPathOrderPolicy extends ApiAuthorizationPolicyBase<RowPathOrderEntity> {
	public onBeforeCreate() {
		return this.scopeToOwner("ownerId");
	}

	public onBeforeDelete() {
		return this.scopeToOwner("ownerId");
	}

	public onBeforeGet() {
		return this.scopeToOwner("ownerId");
	}

	public onBeforeGetList() {
		return this.scopeToOwner("ownerId");
	}

	public onBeforePartialUpdate() {
		return this.scopeToOwner("ownerId");
	}

	public onBeforeUpdate() {
		return this.scopeToOwner("ownerId");
	}
}

@Injectable()
@ApiFunctionSubscriber({ entity: RowPathOrderEntity })
export class RowPathOrderFunctionSubscriber extends ApiFunctionSubscriberBase<RowPathOrderEntity> {
	public static events: Array<string> = [];

	public static reset(): void {
		RowPathOrderFunctionSubscriber.events = [];
	}

	private static record(action: string, context: { DATA?: { eventManager?: unknown } }): void {
		RowPathOrderFunctionSubscriber.events.push(`function:${action}:${context.DATA?.eventManager ? "transaction" : "plain"}`);
	}

	public async onBeforeDelete(context: object) {
		RowPathOrderFunctionSubscriber.record("delete", context);

		return undefined;
	}

	public async onBeforeUpdate(context: object) {
		RowPathOrderFunctionSubscriber.record("update", context);

		return undefined;
	}
}

@Injectable()
@ApiRouteSubscriber({ entity: RowPathOrderEntity })
export class RowPathOrderRouteSubscriber extends ApiRouteSubscriberBase<RowPathOrderEntity> {
	public static events: Array<string> = [];

	public static reset(): void {
		RowPathOrderRouteSubscriber.events = [];
	}

	public async onBeforeDelete() {
		RowPathOrderRouteSubscriber.events.push("route:delete");

		return undefined;
	}

	public async onBeforePartialUpdate() {
		RowPathOrderRouteSubscriber.events.push("route:partialUpdate");

		return undefined;
	}
}

const iamAuthorization: IApiControllerAuthorizationProperties<RowPathOrderEntity> = {
	defaultMode: EApiAuthorizationMode.IAM,
	policyNamespace: "row-path:order",
	resourceDefinition: {
		entity: RowPathOrderEntity,
		fields: [
			{ isFilterable: true, path: "resource.ownerId", queryPath: "ownerId" },
			{ isFilterable: true, path: "resource.tenantId", queryPath: "tenantId" },
		],
		namespace: "row-path:order",
		resourcePath: "row-path:order/{tenantId}/{id}",
		resourceType: "row-path:order",
	},
};

export const rowPathIamAttachmentSource: IApiPolicyAttachmentSource = {
	getAttachments(principal: IApiAuthorizationPrincipal) {
		return Promise.resolve({ attachments: [{ policyId: ROW_PATH_IAM_POLICY_ID, principalId: principal.id, principalType: principal.type }], boundaries: [] });
	},
};

export const rowPathIamDocumentSource: IApiPolicyDocumentSource = {
	getDocumentsByIds(ids: ReadonlyArray<string>): Promise<ReadonlyArray<IApiPolicyDocumentRecord>> {
		const record: IApiPolicyDocumentRecord = {
			document: {
				Statement: [
					{
						Action: ["row-path:order:*"],
						Condition: { StringEquals: { "resource.ownerId": "${principal.attributes.ownerId}" } },
						Effect: EApiPolicyEffect.ALLOW,
						Resource: ["row-path:order/*"],
					},
				],
				Version: "2026-01-01",
			},
			id: ROW_PATH_IAM_POLICY_ID,
			namespace: "row-path:order",
			sourceType: EApiPolicySourceType.MANAGED,
			version: "1",
		};

		return Promise.resolve(ids.includes(ROW_PATH_IAM_POLICY_ID) ? [record] : []);
	},
};

// Default row path on a composite key: every key column, in declaration order.
@ApiController<RowPathOrderEntity>({ entity: RowPathOrderEntity, path: "matrix/order", routes: { [EApiRouteType.GET_LIST]: { request: ORDER_REQUEST } } })
export class RowPathOrderController {
	@Inject(RowPathOrderService)
	public readonly service!: RowPathOrderService;
}

class RowPathManualOrderParametersDto {
	@IsUUID()
	public id!: string;
}

// A manual DTO that leaves the tenant out: it only validates, and every key column is still converted by its column rule.
@ApiController<RowPathOrderEntity>({ entity: RowPathOrderEntity, path: "matrix/manual-order", routes: { [EApiRouteType.CREATE]: DISABLED_ROUTE, [EApiRouteType.DELETE]: DISABLED_ROUTE, [EApiRouteType.GET]: { dto: { [EApiDtoType.PARAMETERS]: RowPathManualOrderParametersDto } }, [EApiRouteType.GET_LIST]: DISABLED_ROUTE, [EApiRouteType.PARTIAL_UPDATE]: DISABLED_ROUTE, [EApiRouteType.UPDATE]: DISABLED_ROUTE } })
export class RowPathManualOrderController {
	@Inject(RowPathOrderService)
	public readonly service!: RowPathOrderService;
}

// Custom order of the key columns.
@ApiController<RowPathOrderEntity>({ entity: RowPathOrderEntity, path: "matrix/order-reversed", rowPath: { fields: ["id", "tenantId"] }, routes: { [EApiRouteType.CREATE]: DISABLED_ROUTE, [EApiRouteType.GET_LIST]: DISABLED_ROUTE } })
export class RowPathReversedOrderController {
	@Inject(RowPathOrderService)
	public readonly service!: RowPathOrderService;
}

// The tenant comes from the controller path, the row path takes the rest of the key. Custom routes share the controller.
@ApiControllerObservable()
@ApiController<RowPathOrderEntity>({
	entity: RowPathOrderEntity,
	path: "matrix/tenant/:tenantId/order",
	pathScope: TENANT_SCOPE,
	routes: {
		[EApiRouteType.CREATE]: { relations: { request: { load: { include: { customer: true } }, reference: { key: "id", shape: EApiControllerRelationReferenceShape.SCALAR } } } },
		[EApiRouteType.GET]: { relations: ROW_PATH_ORDER_RESPONSE_RELATIONS },
		[EApiRouteType.GET_LIST]: { relations: ROW_PATH_ORDER_RESPONSE_RELATIONS, request: ORDER_REQUEST },
		[EApiRouteType.PARTIAL_UPDATE]: { relations: { request: { load: { include: { customer: true } }, reference: { key: "id", shape: EApiControllerRelationReferenceShape.SCALAR } } } },
	},
})
export class RowPathTenantOrderController {
	@Inject(RowPathCustomerService)
	public readonly customerService!: RowPathCustomerService;

	@Inject(RowPathOrderService)
	public readonly service!: RowPathOrderService;

	@ApiRouteCustom<RowPathOrderEntity>({
		relations: { response: { load: { include: { notes: true } }, reference: { key: "id", shape: EApiControllerRelationReferenceShape.OBJECT } } },
		resource: { action: "custom.byName", entity: RowPathOrderEntity },
		response: { status: HttpStatus.OK, type: undefined },
		route: { method: RequestMethod.GET, path: "by-name/:name" },
	})
	public async byName(@Param("tenantId") tenantId: string, @Param("name") name: string): Promise<RowPathOrderEntity> {
		return await this.service.repository.findOneOrFail({ where: { name, tenantId } });
	}

	@ApiRouteCustom<RowPathOrderEntity>({
		resource: { action: "custom.ping", entity: RowPathOrderEntity },
		response: { status: HttpStatus.OK, type: undefined },
		route: { method: RequestMethod.GET, path: "ping" },
	})
	public ping(@Param("tenantId") tenantId: string): { tenantId: string } {
		return { tenantId };
	}
}

// A CURSOR list under the same binding.
@ApiController<RowPathOrderEntity>({ entity: RowPathOrderEntity, path: "matrix/tenant/:tenantId/order-cursor", pathScope: TENANT_SCOPE, routes: { [EApiRouteType.CREATE]: DISABLED_ROUTE, [EApiRouteType.DELETE]: DISABLED_ROUTE, [EApiRouteType.GET]: DISABLED_ROUTE, [EApiRouteType.GET_LIST]: { relations: ROW_PATH_ORDER_RESPONSE_RELATIONS, request: CURSOR_REQUEST }, [EApiRouteType.PARTIAL_UPDATE]: DISABLED_ROUTE, [EApiRouteType.UPDATE]: DISABLED_ROUTE } })
export class RowPathCursorOrderController {
	@Inject(RowPathOrderService)
	public readonly service!: RowPathOrderService;
}

// A GET identity alias, the rest of the key bound by the controller path.
@ApiController<RowPathOrderEntity>({ entity: RowPathOrderEntity, path: "matrix/alias/:tenantId/order", pathScope: TENANT_SCOPE, routes: { [EApiRouteType.CREATE]: DISABLED_ROUTE, [EApiRouteType.DELETE]: DISABLED_ROUTE, [EApiRouteType.GET]: { identity: { parameter: "orderId" } }, [EApiRouteType.GET_LIST]: DISABLED_ROUTE, [EApiRouteType.PARTIAL_UPDATE]: DISABLED_ROUTE, [EApiRouteType.UPDATE]: DISABLED_ROUTE } })
export class RowPathAliasOrderController {
	@Inject(RowPathOrderService)
	public readonly service!: RowPathOrderService;
}

const scopedRoutes = { [EApiRouteType.CREATE]: { security: SECURITY }, [EApiRouteType.DELETE]: { security: SECURITY }, [EApiRouteType.GET]: { security: SECURITY }, [EApiRouteType.GET_LIST]: { request: ORDER_REQUEST, security: SECURITY }, [EApiRouteType.PARTIAL_UPDATE]: { security: SECURITY }, [EApiRouteType.UPDATE]: { security: SECURITY } };

@ApiControllerObservable()
@ApiControllerSecurable()
@ApiController<RowPathOrderEntity>({ authorization: { defaultMode: EApiAuthorizationMode.HOOKS }, entity: RowPathOrderEntity, path: "matrix/hooks/:tenantId/order", pathScope: TENANT_SCOPE, routes: scopedRoutes as never })
export class RowPathHooksOrderController {
	@Inject(RowPathOrderService)
	public readonly service!: RowPathOrderService;
}

@ApiControllerObservable()
@ApiControllerSecurable()
@ApiController<RowPathOrderEntity>({ authorization: { defaultMode: EApiAuthorizationMode.HOOKS }, entity: RowPathOrderEntity, path: "matrix/hooks-order", routes: scopedRoutes as never })
export class RowPathHooksCompositeOrderController {
	@Inject(RowPathOrderService)
	public readonly service!: RowPathOrderService;
}

@ApiControllerObservable()
@ApiControllerSecurable()
@ApiController<RowPathOrderEntity>({ authorization: iamAuthorization, entity: RowPathOrderEntity, path: "matrix/iam/:tenantId/order", pathScope: TENANT_SCOPE, routes: scopedRoutes as never })
export class RowPathIamOrderController {
	@Inject(RowPathOrderService)
	public readonly service!: RowPathOrderService;
}

/**
 * Creates a controller whose write routes run in one transaction mode.
 * @param {EApiFunctionTransactionMode} mode - Route transaction mode.
 * @returns {Type<unknown>} Controller class.
 */
function createTransactionController(mode: EApiFunctionTransactionMode): Type<unknown> {
	const name: string = `RowPath${mode.charAt(0)}${mode.slice(1).toLowerCase()}TransactionOrderController`;
	const controller: Type<{ service: RowPathOrderService }> = { [name]: class {} }[name] as Type<{ service: RowPathOrderService }>;
	const route = { transaction: { mode } };
	// A generated create always runs in a transaction, so a controller without one keeps SUPPORTS on CREATE.
	const createRoute = { transaction: { mode: mode === EApiFunctionTransactionMode.NONE ? EApiFunctionTransactionMode.SUPPORTS : mode } };

	Inject(RowPathOrderService)(controller.prototype as object, "service");
	ApiController<RowPathOrderEntity>({ entity: RowPathOrderEntity, path: `matrix/transaction/${mode.toLowerCase()}/:tenantId/order`, pathScope: TENANT_SCOPE, routes: { [EApiRouteType.CREATE]: createRoute, [EApiRouteType.DELETE]: route, [EApiRouteType.GET]: route, [EApiRouteType.GET_LIST]: DISABLED_ROUTE, [EApiRouteType.PARTIAL_UPDATE]: route, [EApiRouteType.UPDATE]: route } })(controller);

	return controller;
}

export const ROW_PATH_TRANSACTION_MODES: ReadonlyArray<EApiFunctionTransactionMode> = [EApiFunctionTransactionMode.NONE, EApiFunctionTransactionMode.REQUIRED, EApiFunctionTransactionMode.SUPPORTS];

const ROW_PATH_TRANSACTION_CONTROLLERS: Array<Type<unknown>> = ROW_PATH_TRANSACTION_MODES.map((mode: EApiFunctionTransactionMode): Type<unknown> => createTransactionController(mode));

// The service demands a transaction, so the route opens it and the path resolution runs inside.
@ApiController<RowPathOrderEntity>({
	entity: RowPathOrderEntity,
	path: "matrix/transaction/mandatory/:tenantId/order",
	pathScope: TENANT_SCOPE,
	routes: {
		[EApiRouteType.CREATE]: { transaction: { mode: EApiFunctionTransactionMode.REQUIRED } },
		[EApiRouteType.DELETE]: { transaction: { mode: EApiFunctionTransactionMode.REQUIRED } },
		[EApiRouteType.GET]: { transaction: { mode: EApiFunctionTransactionMode.REQUIRED } },
		[EApiRouteType.GET_LIST]: DISABLED_ROUTE,
		[EApiRouteType.PARTIAL_UPDATE]: { transaction: { mode: EApiFunctionTransactionMode.REQUIRED } },
		[EApiRouteType.UPDATE]: { transaction: { mode: EApiFunctionTransactionMode.REQUIRED } },
	},
})
export class RowPathMandatoryOrderController {
	@Inject(RowPathMandatoryOrderService)
	public readonly service!: RowPathMandatoryOrderService;
}

// A join column bound by the controller path, so the relation key of a body must not escape it.
@ApiController<RowPathAssetEntity>({ entity: RowPathAssetEntity, path: "matrix/customer/:ownerId/asset", pathScope: { parameters: [{ field: "ownerId", parameter: "ownerId" }] }, routes: { [EApiRouteType.GET_LIST]: { request: ORDER_REQUEST } } })
export class RowPathAssetController {
	@Inject(RowPathAssetService)
	public readonly service!: RowPathAssetService;
}

// A table inheritance root under the binding.
@ApiController<RowPathShapeEntity>({
	entity: RowPathShapeEntity,
	path: "matrix/group/:groupId/shape",
	pathScope: { parameters: [{ field: "groupId", parameter: "groupId" }] },
	routes: { [EApiRouteType.CREATE]: DISABLED_ROUTE, [EApiRouteType.DELETE]: DISABLED_ROUTE, [EApiRouteType.GET_LIST]: { request: { [EApiControllerRequestTarget.QUERY]: { order: { fields: {}, tieBreakers: [{ direction: EFilterOrderDirection.ASC, field: "id" }], unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT } } } }, [EApiRouteType.PARTIAL_UPDATE]: DISABLED_ROUTE, [EApiRouteType.UPDATE]: DISABLED_ROUTE },
})
export class RowPathShapeController {
	@Inject(RowPathShapeService)
	public readonly service!: RowPathShapeService;
}

const ALL_ROUTES_DISABLED = { [EApiRouteType.CREATE]: DISABLED_ROUTE, [EApiRouteType.DELETE]: DISABLED_ROUTE, [EApiRouteType.GET]: DISABLED_ROUTE, [EApiRouteType.GET_LIST]: DISABLED_ROUTE, [EApiRouteType.PARTIAL_UPDATE]: DISABLED_ROUTE, [EApiRouteType.UPDATE]: DISABLED_ROUTE } as const;

// Custom routes only, so the generated route rules do not apply to any path parameter.
@ApiController<RowPathOrderEntity>({ entity: RowPathOrderEntity, path: "matrix/gateway/:region/:zone/:rack/:slot", routes: ALL_ROUTES_DISABLED })
export class RowPathGatewayController {
	@Inject(RowPathOrderService)
	public readonly service!: RowPathOrderService;

	@Get("status")
	public status(@Param() parameters: Record<string, string>): Record<string, string> {
		return { ...parameters };
	}
}

// The Fastify adapter takes neither a wildcard before a trailing slash nor this optional segment, so these two controllers are compiled and not mounted.
@ApiController<RowPathOrderEntity>({ entity: RowPathOrderEntity, path: "matrix/files/*splat", routes: ALL_ROUTES_DISABLED })
export class RowPathWildcardController {
	public constructor(public readonly service: RowPathOrderService) {}
}

@ApiController<RowPathOrderEntity>({ entity: RowPathOrderEntity, path: "matrix/optional{/:section}", routes: ALL_ROUTES_DISABLED })
export class RowPathOptionalController {
	public constructor(public readonly service: RowPathOrderService) {}
}

export const ROW_PATH_MATRIX_CONTROLLERS: Array<Type<unknown>> = [RowPathAliasOrderController, RowPathAssetController, RowPathGatewayController, RowPathHooksCompositeOrderController, RowPathHooksOrderController, RowPathIamOrderController, RowPathMandatoryOrderController, RowPathManualOrderController, RowPathOrderController, RowPathReversedOrderController, RowPathShapeController, RowPathTenantOrderController, ...ROW_PATH_TRANSACTION_CONTROLLERS];
export const ROW_PATH_MATRIX_ENTITIES: Array<Type<unknown>> = [RowPathAssetEntity, RowPathCircleEntity, RowPathCustomerEntity, RowPathLineEntity, RowPathNoteEntity, RowPathOrderEntity, RowPathShapeEntity, RowPathSquareEntity];
export const ROW_PATH_MATRIX_PROVIDERS: Array<Type<unknown>> = [RowPathAssetService, RowPathCustomerService, RowPathGuard, RowPathMandatoryOrderService, RowPathOrderFunctionSubscriber, RowPathOrderPolicy, RowPathOrderRouteSubscriber, RowPathOrderService, RowPathShapeService];
