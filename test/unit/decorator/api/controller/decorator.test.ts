import "reflect-metadata";

import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { CanActivate } from "@nestjs/common";
import type { Repository } from "typeorm";

import { ApiServiceBase } from "@class/api";
import { ApiControllerGeneratedFunctionCapability } from "@class/api/controller/generated/function-capability.class";
import { ApiControllerGeneratedInsertedKeyStorage } from "@class/api/controller/generated/inserted-key-storage.class";
import { ApiControllerGeneratedReadScopeStorage } from "@class/api/controller/generated/read-scope-storage.class";
import { CONTROLLER_API_DECORATOR_CONSTANT } from "@constant/decorator/api/controller.constant";
import { CONTROLLER_STARTUP_CHECK_METADATA_KEY } from "@constant/decorator/api/controller-startup-check.constant";
import { ApiController } from "@decorator/api/controller/decorator";
import { ApiControllerObservable } from "@decorator/api/controller/observable.decorator";
import { ApiControllerSecurable } from "@decorator/api/controller/securable.decorator";
import { ApiPropertyDescribe } from "@decorator/api/property/describe.decorator";
import { EApiAuthenticationType, EApiControllerGetListQueryPaginationMode, EApiControllerGetListQueryUnlistedFields, EApiControllerRelationReferenceShape, EApiControllerRequestTarget, EApiDtoType, EApiFunctionType, EApiPropertyDescribeType, EApiPropertyNumberType, EApiPropertyStringType, EApiRouteType } from "@enum/decorator/api";
import { EFilterOrderDirection } from "@enum/filter/order-direction.enum";
import { ApiProperty } from "@nestjs/swagger";
import { KeyPageAccountEntity } from "@test/unit/class/api/function/fixture/key-page-account.entity";
import { KeyPageAuditorEntity } from "@test/unit/class/api/function/fixture/key-page-auditor.entity";
import { KeyPageBatchEntity } from "@test/unit/class/api/function/fixture/key-page-batch.entity";
import { KeyPageEntryEntity } from "@test/unit/class/api/function/fixture/key-page-entry.entity";
import { KeyPageHolderEntity } from "@test/unit/class/api/function/fixture/key-page-holder.entity";
import { KeyPageJournalEntity } from "@test/unit/class/api/function/fixture/key-page-journal.entity";
import { KeyPageReceiptEntity } from "@test/unit/class/api/function/fixture/key-page-receipt.entity";
import { ApiControllerAssertSchemaNames } from "@utility/api/controller/assert-schema-names.utility";
import { LoggerUtility } from "@utility/logger.utility";
import { Column, DataSource, Entity, getMetadataArgsStorage, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { describe, expect, it, vi } from "vitest";

import { createGeneratedServiceDouble } from "@test/unit/fixture";

const FACTORY_ENTITY_ID: string = "11111111-1111-4111-8111-111111111111";

// Two entity classes with one name make a string relation target ambiguous.
["decorator_ambiguous_owners_first", "decorator_ambiguous_owners_second"].map((table: string): unknown => {
	@Entity(table)
	class DecoratorAmbiguousOwner {
		@PrimaryGeneratedColumn("uuid")
		public id!: string;
	}

	return DecoratorAmbiguousOwner;
});

@Entity("factory_entities")
class FactoryEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({
		description: "id",
		type: EApiPropertyDescribeType.UUID,
	})
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "name",
		exampleValue: "Name",
		format: EApiPropertyStringType.STRING,
		maxLength: 50,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public name!: string;

	@Column({ type: "int" })
	@ApiPropertyDescribe({
		description: "count",
		exampleValue: 1,
		format: EApiPropertyNumberType.INTEGER,
		maximum: 10,
		minimum: 0,
		multipleOf: 1,
		type: EApiPropertyDescribeType.NUMBER,
	})
	public count!: number;
}

class FactoryService extends ApiServiceBase<FactoryEntity> {
	public override create = vi.fn(async (properties: Partial<FactoryEntity>) => {
		const created: FactoryEntity = { id: properties.id ?? "id-1", name: properties.name ?? "created", count: 1 } as FactoryEntity;

		ApiControllerGeneratedInsertedKeyStorage.claim(properties, "FactoryEntity")?.({ id: created.id });

		return created;
	});
	public override get = vi.fn(async (properties: { where?: Partial<FactoryEntity> }) => {
		ApiControllerGeneratedReadScopeStorage.claim(EApiFunctionType.GET, properties);

		return { id: properties.where?.id ?? "id-1", name: "found", count: 2 } as FactoryEntity;
	});
	public readonly repository = { find: vi.fn(async () => [{ id: "id-1" }]), metadata: { primaryColumns: [] } } as unknown as Repository<FactoryEntity>;
	public override update = vi.fn(async (criteria: Partial<FactoryEntity>, properties: Partial<FactoryEntity>) => {
		ApiControllerGeneratedReadScopeStorage.claim(EApiFunctionType.UPDATE, criteria);

		return { id: criteria.id ?? "id-1", name: properties.name ?? "updated", count: 3 } as FactoryEntity;
	});
	public override delete = vi.fn(async (criteria: Partial<FactoryEntity>) => {
		ApiControllerGeneratedReadScopeStorage.claim(EApiFunctionType.DELETE, criteria);
	});
	public override getList = vi.fn(async (properties: object) => {
		ApiControllerGeneratedReadScopeStorage.claim(EApiFunctionType.GET_LIST, properties);

		return {
			count: 1,
			currentPage: 1,
			items: [{ id: "id-1", name: "item", count: 1 }],
			totalCount: 1,
			totalPages: 1,
		};
	});

	public constructor() {
		super();
		ApiControllerGeneratedFunctionCapability.mark(this.create, EApiFunctionType.CREATE, FactoryEntity);
		ApiControllerGeneratedFunctionCapability.mark(this.get, EApiFunctionType.GET, FactoryEntity);
		ApiControllerGeneratedFunctionCapability.mark(this.getList, EApiFunctionType.GET_LIST, FactoryEntity);
		ApiControllerGeneratedFunctionCapability.mark(this.update, EApiFunctionType.UPDATE, FactoryEntity);
		ApiControllerGeneratedFunctionCapability.mark(this.delete, EApiFunctionType.DELETE, FactoryEntity);
	}
}

class FactoryController {
	public service: FactoryService;

	public constructor() {
		this.service = new FactoryService();
	}
}

// The key page fixtures have no Automator metadata; a described child of the entity is in the lineage of its repository.
const createDescribedEntity = (entity: Function): Function => {
	const DescribedEntity = class extends (entity as new () => object) {};

	Entity("controller_decorator_described")(DescribedEntity);

	for (const { options, propertyName, target } of getMetadataArgsStorage().columns) {
		if (target === entity && options.primary) {
			ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })(DescribedEntity.prototype, propertyName);
		}
	}

	return DescribedEntity;
};

describe("ApiController", () => {
	it("initializes factory routes and executes CRUD methods", async () => {
		const ControllerClass = ApiController<IApiBaseEntity>({
			entity: FactoryEntity,
			routes: {
				[EApiRouteType.CREATE]: {},
				[EApiRouteType.DELETE]: {},
				[EApiRouteType.GET]: {},
				[EApiRouteType.GET_LIST]: {},
				[EApiRouteType.PARTIAL_UPDATE]: {},
				[EApiRouteType.UPDATE]: {},
			},
		})(FactoryController);

		const controller = new ControllerClass() as FactoryController & Record<string, any>;
		const dataSource: DataSource = new DataSource({ entities: [FactoryEntity], type: "postgres" });

		// GET_LIST reads filter column types from the repository metadata; the test never connects.
		await (dataSource as unknown as { buildMetadatas: () => Promise<void> }).buildMetadatas();
		(controller.service as FactoryService & { repository?: unknown }).repository = dataSource.getRepository(FactoryEntity);

		const headers: Record<string, string> = {};
		const ip = "127.0.0.1";

		await controller.create({ id: FACTORY_ENTITY_ID, name: "created", count: 1 }, headers, ip);
		await controller.get({ id: FACTORY_ENTITY_ID }, headers, ip);
		await controller.getList({ limit: 10, page: 1 }, headers, ip);
		await controller.update({ id: FACTORY_ENTITY_ID }, { name: "updated" }, headers, ip);
		await controller.partialUpdate({ id: FACTORY_ENTITY_ID }, { name: "patched" }, headers, ip);
		await controller.delete({ id: FACTORY_ENTITY_ID }, headers, ip);

		expect(controller.service.create).toHaveBeenCalled();
		expect(controller.service.get).toHaveBeenCalled();
		expect(controller.service.getList).toHaveBeenCalled();
		expect(controller.service.update).toHaveBeenCalled();
		expect(controller.service.delete).toHaveBeenCalled();
		expect(Reflect.getMetadata(CONTROLLER_API_DECORATOR_CONSTANT.ENTITY_METADATA_KEY, ControllerClass)).toBe(FactoryEntity);
	});

	it("marks controller as observable", () => {
		@ApiControllerObservable()
		class ObservableController {}

		expect(Reflect.getMetadata(CONTROLLER_API_DECORATOR_CONSTANT.OBSERVABLE_METADATA_KEY, ObservableController)).toBe(true);
	});

	it("marks controller as securable", () => {
		@ApiControllerSecurable()
		class SecurableController {}

		expect(Reflect.getMetadata(CONTROLLER_API_DECORATOR_CONSTANT.SECURABLE_METADATA_KEY, SecurableController)).toBe(true);
	});

	it("preserves controller name and constructor behavior", () => {
		class BaseController {
			public service: FactoryService = new FactoryService();

			public constructor(public readonly token: string) {}
		}

		const Decorated = ApiController<IApiBaseEntity>({
			entity: FactoryEntity,
			routes: {},
		})(BaseController as unknown as { new (...arguments_: Array<any>): { service: ApiServiceBase<any> } });

		const instance = new Decorated("secret") as BaseController;

		expect(Decorated.name).toBe("BaseController");
		expect(instance).toBeInstanceOf(BaseController);
		expect(instance.token).toBe("secret");
	});

	it("rejects relation loads of enabled routes at bootstrap, then runs the controller hook", async () => {
		vi.spyOn(LoggerUtility.prototype, "error").mockImplementation((): void => undefined);

		const dataSource: DataSource = new DataSource({ entities: [KeyPageAccountEntity, KeyPageJournalEntity], type: "postgres" });

		// Metadata is enough for the startup check; the test never connects.
		await (dataSource as unknown as { buildMetadatas: () => Promise<void> }).buildMetadatas();

		const hook = vi.fn();
		const disabled = { generation: { isEnabled: false } };

		const createController = (getRoute: object): { onApplicationBootstrap: () => Promise<void> } => {
			class JournalController {
				public service: { repository: unknown } = { repository: dataSource.getRepository(KeyPageJournalEntity) };

				public onApplicationBootstrap(): void {
					hook();
				}
			}

			const Decorated = ApiController<IApiBaseEntity>({
				entity: createDescribedEntity(KeyPageJournalEntity),
				routes: {
					[EApiRouteType.CREATE]: disabled,
					[EApiRouteType.DELETE]: disabled,
					[EApiRouteType.GET]: getRoute,
					[EApiRouteType.GET_LIST]: disabled,
					[EApiRouteType.PARTIAL_UPDATE]: disabled,
					[EApiRouteType.UPDATE]: disabled,
				},
			} as never)(JournalController as never) as unknown as new () => { onApplicationBootstrap: () => Promise<void> };

			return new Decorated();
		};

		await expect(createController({}).onApplicationBootstrap()).rejects.toThrow('Controller "JournalController" route "get": @RelationId property "readerIds" of entity "KeyPageJournalEntity"');
		expect(hook).not.toHaveBeenCalled();

		await createController(disabled).onApplicationBootstrap();
		expect(hook).toHaveBeenCalledOnce();

		vi.restoreAllMocks();
	});
	it("checks unlisted generated routes and request relation loads at bootstrap", async () => {
		vi.spyOn(LoggerUtility.prototype, "error").mockImplementation((): void => undefined);

		const dataSource: DataSource = new DataSource({ entities: [KeyPageAccountEntity, KeyPageAuditorEntity, KeyPageBatchEntity, KeyPageEntryEntity, KeyPageHolderEntity, KeyPageJournalEntity, KeyPageReceiptEntity], type: "postgres" });

		// Metadata is enough for the startup check; the test never connects.
		await (dataSource as unknown as { buildMetadatas: () => Promise<void> }).buildMetadatas();

		const disabled = { generation: { isEnabled: false } };
		const allDisabled = { [EApiRouteType.CREATE]: disabled, [EApiRouteType.DELETE]: disabled, [EApiRouteType.GET]: disabled, [EApiRouteType.GET_LIST]: disabled, [EApiRouteType.PARTIAL_UPDATE]: disabled, [EApiRouteType.UPDATE]: disabled };
		const bootstrap = async (entity: Function, routes: object): Promise<void> => {
			const describedEntity = createDescribedEntity(entity);
			const create = async (): Promise<IApiBaseEntity> => ({});
			const get = async (): Promise<IApiBaseEntity> => ({});

			// A CREATE route writes through a protected CREATE function of the service and reads its response through a protected GET function.
			ApiControllerGeneratedFunctionCapability.mark(create, EApiFunctionType.CREATE, describedEntity as never);
			ApiControllerGeneratedFunctionCapability.mark(get, EApiFunctionType.GET, describedEntity as never);

			class CheckedController {
				public receiptService: FactoryService = new FactoryService();

				public service: { create: typeof create; get: typeof get; repository: unknown } = { create, get, repository: dataSource.getRepository(entity) };
			}

			const Decorated = ApiController<IApiBaseEntity>({ entity: describedEntity, routes } as never)(CheckedController as never) as unknown as new () => { onApplicationBootstrap: () => Promise<void> };

			await new Decorated().onApplicationBootstrap();
		};
		const { [EApiRouteType.GET]: _get, ...withoutGet } = allDisabled;
		const requestLoad = (locks?: object): object => ({ ...allDisabled, [EApiRouteType.CREATE]: { relations: { request: { load: { include: { receipt: true }, ...(locks ? { locks } : {}) }, reference: { key: "id", shape: EApiControllerRelationReferenceShape.OBJECT } } } } });

		await expect(bootstrap(KeyPageJournalEntity, withoutGet)).rejects.toThrow('Controller "CheckedController" route "get": @RelationId property "readerIds" of entity "KeyPageJournalEntity"');
		await expect(bootstrap(KeyPageJournalEntity, allDisabled)).resolves.toBeUndefined();
		await expect(bootstrap(KeyPageHolderEntity, requestLoad())).rejects.toThrow('Controller "CheckedController" route "create" request relation "receipt": @RelationId property "readerIds" of entity "KeyPageJournalEntity"');
		await expect(bootstrap(KeyPageHolderEntity, requestLoad({ receipt: { mode: "pessimistic_write" } }))).resolves.toBeUndefined();

		vi.restoreAllMocks();
	});

	describe("schema names", () => {
		const getOnlyRoutes = {
			[EApiRouteType.CREATE]: { generation: { isEnabled: false } },
			[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
			[EApiRouteType.GET_LIST]: { generation: { isEnabled: false } },
			[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
			[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
		} as const;

		it("names generated DTOs after the controller class without its Controller suffix", () => {
			class SchemaNameInvoiceController {
				public service: FactoryService = new FactoryService();
			}

			ApiController<IApiBaseEntity>({ entity: FactoryEntity, path: "schema-name-invoices", routes: getOnlyRoutes })(SchemaNameInvoiceController);

			const responseType: { name: string } | undefined = (Reflect.getMetadata("swagger/apiResponse", (SchemaNameInvoiceController.prototype as unknown as Record<string, object>).get as object) as Record<string, { type?: { name: string } }> | undefined)?.["200"]?.type;

			expect(responseType?.name).toBe("SchemaNameInvoiceGetResponseDTO");
		});

		it("decorates two controller classes with the same name, and the bootstrap check of an application with both fails, naming both paths", () => {
			const createController = (): { new (): { service: FactoryService } } =>
				class SchemaNameDuplicateController {
					public service: FactoryService = new FactoryService();
				};

			const AdminController: { new (): { service: FactoryService } } = ApiController<IApiBaseEntity>({ entity: FactoryEntity, path: "admin/schema-name-duplicates", routes: getOnlyRoutes })(createController());
			const PublicController: { new (): { service: FactoryService } } = ApiController<IApiBaseEntity>({ entity: FactoryEntity, path: "schema-name-duplicates", routes: getOnlyRoutes })(createController());

			expect(() => ApiControllerAssertSchemaNames([{ controller: AdminController }])).not.toThrow();
			expect(() => ApiControllerAssertSchemaNames([{ controller: AdminController }, { controller: PublicController }])).toThrow('Controllers SchemaNameDuplicateController (path "admin/schema-name-duplicates") and SchemaNameDuplicateController (path "schema-name-duplicates") have the same schema prefix "SchemaNameDuplicate" in one application');
		});

		it("fails startup for an anonymous controller class", () => {
			const anonymousController: { new (): { service: FactoryService } } = (() =>
				class {
					public service: FactoryService = new FactoryService();
				})();

			expect(anonymousController.name).toBe("");
			expect(() => ApiController<IApiBaseEntity>({ entity: FactoryEntity, path: "schema-name-anonymous", routes: getOnlyRoutes })(anonymousController)).toThrow('Controller with path "schema-name-anonymous" is an anonymous class');
		});

		it("fails the bootstrap check when two generated DTO classes get the same name", () => {
			class SchemaNameOrderController {
				public service: FactoryService = new FactoryService();
			}

			class SchemaNameOrderListController {
				public service: FactoryService = new FactoryService();
			}

			class SchemaNameOrderItemDto {}

			const OrderController: typeof SchemaNameOrderController = ApiController<IApiBaseEntity>({ entity: FactoryEntity, path: "schema-name-orders", routes: getOnlyRoutes })(SchemaNameOrderController);
			const OrderListController: typeof SchemaNameOrderListController = ApiController<IApiBaseEntity>({
				entity: FactoryEntity,
				path: "schema-name-order-lists",
				routes: { ...getOnlyRoutes, [EApiRouteType.GET]: { generation: { isEnabled: false } }, [EApiRouteType.GET_LIST]: { dto: { response: { itemType: SchemaNameOrderItemDto, name: "SchemaNameOrderGetResponseDTO" } } } },
			})(SchemaNameOrderListController);

			expect(() => ApiControllerAssertSchemaNames([{ controller: OrderController }, { controller: OrderListController }])).toThrow('OpenAPI component name "SchemaNameOrderGetResponseDTO" belongs to two different classes: the get response DTO of controller prefix "SchemaNameOrder", and the getList page response of controller prefix "SchemaNameOrderList"');
		});
		it("fails the bootstrap check for two controller classes with one prefix on one path", () => {
			class SchemaNameSamePathController {
				public service: FactoryService = new FactoryService();
			}

			class SchemaNameSamePath {
				public service: FactoryService = new FactoryService();
			}

			const FirstController: typeof SchemaNameSamePathController = ApiController<IApiBaseEntity>({ entity: FactoryEntity, path: "schema-name-same-path", routes: getOnlyRoutes })(SchemaNameSamePathController);
			const SecondController: typeof SchemaNameSamePath = ApiController<IApiBaseEntity>({ entity: FactoryEntity, path: "schema-name-same-path", routes: getOnlyRoutes })(SchemaNameSamePath);

			expect(() => ApiControllerAssertSchemaNames([{ controller: FirstController }, { controller: SecondController }])).toThrow('Controllers SchemaNameSamePathController (path "schema-name-same-path") and SchemaNameSamePath (path "schema-name-same-path") have the same schema prefix "SchemaNameSamePath" in one application');
		});

		it("fails the bootstrap check when a hand-written DTO has the name of a generated DTO of another controller", () => {
			class SchemaNameW1Controller {
				public service: FactoryService = new FactoryService();
			}

			class SchemaNameW2Controller {
				public service: FactoryService = new FactoryService();
			}

			class SchemaNameW1GetResponseDTO {
				@ApiProperty({ type: String })
				public id!: string;
			}

			const W1Controller: typeof SchemaNameW1Controller = ApiController<IApiBaseEntity>({ entity: FactoryEntity, path: "schema-name-w1", routes: getOnlyRoutes })(SchemaNameW1Controller);
			const W2Controller: typeof SchemaNameW2Controller = ApiController<IApiBaseEntity>({
				entity: FactoryEntity,
				path: "schema-name-w2",
				routes: { ...getOnlyRoutes, [EApiRouteType.GET]: { dto: { [EApiDtoType.RESPONSE]: SchemaNameW1GetResponseDTO } } },
			})(SchemaNameW2Controller);

			expect(() => ApiControllerAssertSchemaNames([{ controller: W1Controller }, { controller: W2Controller }])).toThrow('OpenAPI component name "SchemaNameW1GetResponseDTO" belongs to two different classes: the get response DTO of controller prefix "SchemaNameW1", and the 200 response of route get in controller SchemaNameW2Controller');
		});
	});

	describe("string relation targets of a GET_LIST route", () => {
		class AmbiguousRelationGuard implements CanActivate {
			public canActivate(): boolean {
				return true;
			}
		}

		class AmbiguousRelationOtherGuard implements CanActivate {
			public canActivate(): boolean {
				return true;
			}
		}

		class AmbiguousRelationQueryDto {
			public limit?: number;
		}

		const decorate = (entity: new () => object, getList: object): new () => object => {
			class AmbiguousRelationController {
				public service: ApiServiceBase<object> = new ApiServiceBase<object>();
			}

			return ApiController<object>({
				entity,
				routes: {
					[EApiRouteType.CREATE]: { generation: { isEnabled: false } },
					[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
					[EApiRouteType.GET]: { generation: { isEnabled: false } },
					[EApiRouteType.GET_LIST]: getList,
					[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
					[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
				},
			})(AmbiguousRelationController);
		};

		const ambiguousError = 'Metadata target "DecoratorAmbiguousOwner" matches 2 entity classes in TypeORM metadata';
		const manualQuery = { dto: { [EApiDtoType.QUERY]: AmbiguousRelationQueryDto } };

		@Entity("decorator_ambiguous_guarded_holders")
		class DecoratorAmbiguousGuardedHolder {
			@PrimaryGeneratedColumn("uuid")
			@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
			public id!: string;

			@ManyToOne("DecoratorAmbiguousOwner")
			@ApiPropertyDescribe({ description: "owner", properties: { [EApiRouteType.GET_LIST]: { [EApiDtoType.QUERY]: { guard: { guards: AmbiguousRelationGuard } } } }, type: EApiPropertyDescribeType.RELATION })
			public owner!: object;
		}

		@Entity("decorator_ambiguous_to_many_holders")
		class DecoratorAmbiguousToManyHolder {
			@PrimaryGeneratedColumn("uuid")
			@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
			public id!: string;

			@OneToMany("DecoratorAmbiguousOwner", "holder")
			@ApiPropertyDescribe({ description: "owners", type: EApiPropertyDescribeType.RELATION })
			public owners!: Array<object>;
		}

		it("passes the route guard to the check, so a relation hidden from that guard does not fail", () => {
			const security = (guard: new () => CanActivate): object => ({ security: { authentication: { guard, type: EApiAuthenticationType.USER } } });
			const Controller = decorate(DecoratorAmbiguousGuardedHolder, { ...manualQuery, ...security(AmbiguousRelationOtherGuard) });

			expect(() => new Controller()).not.toThrow();
			expect(() => decorate(DecoratorAmbiguousGuardedHolder, { ...manualQuery, ...security(AmbiguousRelationGuard) })).toThrowError(ambiguousError);
		});

		it.each([
			["a typed filter", { request: { [EApiControllerRequestTarget.QUERY]: { filter: { fields: {}, unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT } } } }],
			["a manual QUERY DTO", manualQuery],
			["pagination only", { request: { [EApiControllerRequestTarget.QUERY]: { pagination: { mode: EApiControllerGetListQueryPaginationMode.PAGE } } } }],
		])("does not fail a route with %s on a to-many relation no filter can reach", (_case: string, routeConfig: object) => {
			const Controller = decorate(DecoratorAmbiguousToManyHolder, routeConfig);

			expect(() => new Controller()).not.toThrow();
		});

		it("does not fail a pagination-only route at instantiation on a to-many relation whose target became ambiguous after decoration", () => {
			const declareOwner = (table: string): void => {
				@Entity(table)
				class DecoratorLateToManyOwner {
					@PrimaryGeneratedColumn("uuid")
					@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
					public id!: string;
				}

				void DecoratorLateToManyOwner;
			};

			@Entity("decorator_late_to_many_holders")
			class DecoratorLateToManyHolder {
				@PrimaryGeneratedColumn("uuid")
				@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
				public id!: string;

				@OneToMany("DecoratorLateToManyOwner", "holder")
				@ApiPropertyDescribe({ description: "owners", type: EApiPropertyDescribeType.RELATION })
				public owners!: Array<object>;
			}

			declareOwner("decorator_late_to_many_owners_first");

			const Controller = decorate(DecoratorLateToManyHolder, { request: { [EApiControllerRequestTarget.QUERY]: { pagination: { mode: EApiControllerGetListQueryPaginationMode.PAGE } } } });

			declareOwner("decorator_late_to_many_owners_second");

			expect(() => new Controller()).not.toThrow();
		});
	});

	it("checks a repository from another TypeORM copy at bootstrap and rejects a service without a recognized repository", async () => {
		vi.spyOn(LoggerUtility.prototype, "error").mockImplementation((): void => undefined);

		const dataSource: DataSource = new DataSource({ entities: [KeyPageAccountEntity, KeyPageJournalEntity], type: "postgres" });

		// Metadata is enough for the startup check; the test never connects.
		await (dataSource as unknown as { buildMetadatas: () => Promise<void> }).buildMetadatas();

		const repository = dataSource.getRepository(KeyPageJournalEntity);
		const bootstrap = async (service: unknown): Promise<void> => {
			class ForeignController {
				public service: unknown = service;
			}

			const Decorated = ApiController<IApiBaseEntity>({ entity: FactoryEntity, routes: {} } as never)(ForeignController as never) as unknown as new () => { onApplicationBootstrap: () => Promise<void> };

			await new Decorated().onApplicationBootstrap();
		};
		const disabled = { generation: { isEnabled: false } };
		const bootstrapJournal = async (service: unknown): Promise<void> => {
			class ForeignJournalController {
				public service: unknown = service;
			}

			const Decorated = ApiController<IApiBaseEntity>({ entity: createDescribedEntity(KeyPageJournalEntity), routes: { [EApiRouteType.CREATE]: disabled, [EApiRouteType.DELETE]: disabled, [EApiRouteType.GET]: {}, [EApiRouteType.GET_LIST]: disabled, [EApiRouteType.PARTIAL_UPDATE]: disabled, [EApiRouteType.UPDATE]: disabled } } as never)(ForeignJournalController as never) as unknown as new () => { onApplicationBootstrap: () => Promise<void> };

			await new Decorated().onApplicationBootstrap();
		};

		// A second TypeORM copy brands its own classes, so its repository fails instanceof but keeps the shape.
		await expect(bootstrapJournal({ repository: { manager: repository.manager, metadata: repository.metadata } })).rejects.toThrow('Controller "ForeignJournalController" route "get": @RelationId property "readerIds" of entity "KeyPageJournalEntity"');
		await expect(bootstrap({ repository: { manager: repository.manager, metadata: repository.metadata } })).rejects.toThrow('Controller "ForeignController" serves entity FactoryEntity (table factory_entities), but its service repository is for KeyPageJournalEntity');
		await expect(bootstrap({ repository: { find: vi.fn() } })).rejects.toThrow('Controller "ForeignController" of entity "FactoryEntity": service.repository is not a usable TypeORM repository because its metadata is not TypeORM entity metadata. In tests, use a repository of an in-memory DataSource and stub its methods: https://elsikora.com/docs/nestjs-crud-automator/guides/testing');
		await expect(bootstrap({ repository: { metadata: repository.metadata } })).rejects.toThrow('Controller "ForeignController" of entity "FactoryEntity": service.repository is not a usable TypeORM repository because its manager is not a TypeORM entity manager bound to a data source.');
		await expect(bootstrap({})).rejects.toThrow('Controller "ForeignController" of entity "FactoryEntity": service.repository is not a usable TypeORM repository because the service has no repository.');
		await expect(bootstrap(undefined)).rejects.toThrow('Controller "ForeignController" of entity "FactoryEntity": service.repository is not a usable TypeORM repository because the controller has no service.');

		vi.restoreAllMocks();
	});

	it("runs the startup checks once on the decorated class and on the class the decorator returns", async () => {
		vi.spyOn(LoggerUtility.prototype, "error").mockImplementation((): void => undefined);

		const dataSource: DataSource = new DataSource({ entities: [FactoryEntity], type: "postgres" });

		// Metadata is enough for the startup check; the test never connects.
		await (dataSource as unknown as { buildMetadatas: () => Promise<void> }).buildMetadatas();

		const repository = dataSource.getRepository(FactoryEntity);
		const disabled = { generation: { isEnabled: false } };
		const oneRoute = { [EApiRouteType.CREATE]: disabled, [EApiRouteType.DELETE]: disabled, [EApiRouteType.GET]: {}, [EApiRouteType.GET_LIST]: disabled, [EApiRouteType.PARTIAL_UPDATE]: disabled, [EApiRouteType.UPDATE]: disabled };
		const hook = vi.fn();
		const metadata = vi.fn((): unknown => repository.metadata);

		class CountedController {
			public service: unknown = createGeneratedServiceDouble(FactoryEntity, {
				get metadata(): unknown {
					return metadata();
				},
				manager: repository.manager,
			});

			public onApplicationBootstrap(): void {
				hook();
			}
		}

		class SilentController {
			public service: { repository: unknown } = { repository: { find: vi.fn() } };
		}

		const Returned = ApiController<IApiBaseEntity>({ entity: FactoryEntity, routes: oneRoute } as never)(CountedController as never) as unknown as new () => { onApplicationBootstrap: () => Promise<void> };

		await new Returned().onApplicationBootstrap();
		expect(hook).toHaveBeenCalledOnce();
		expect(metadata.mock.calls.length).toBeGreaterThan(0);

		const readsOfOneRun: number = metadata.mock.calls.length;

		await new (CountedController as unknown as new () => { onApplicationBootstrap: () => Promise<void> })().onApplicationBootstrap();
		expect(hook).toHaveBeenCalledTimes(2);
		expect(metadata.mock.calls.length).toBe(readsOfOneRun * 2);

		// A caller that discards the return value and registers the class it decorated keeps the checks.
		ApiController<IApiBaseEntity>({ entity: FactoryEntity, routes: oneRoute } as never)(SilentController as never);
		expect(typeof Reflect.getMetadata(CONTROLLER_STARTUP_CHECK_METADATA_KEY, SilentController)).toBe("function");
		expect(Reflect.getMetadata(CONTROLLER_STARTUP_CHECK_METADATA_KEY, Returned)).toBe(Reflect.getMetadata(CONTROLLER_STARTUP_CHECK_METADATA_KEY, CountedController));

		await expect(new (SilentController as unknown as new () => { onApplicationBootstrap: () => Promise<void> })().onApplicationBootstrap()).rejects.toThrow('Controller "SilentController" of entity "FactoryEntity": service.repository is not a usable TypeORM repository because its metadata is not TypeORM entity metadata');

		vi.restoreAllMocks();
	});

	it("refuses a missing repository only when the controller has an enabled generated route", async () => {
		vi.spyOn(LoggerUtility.prototype, "error").mockImplementation((): void => undefined);

		const dataSource: DataSource = new DataSource({ entities: [FactoryEntity, KeyPageAccountEntity, KeyPageJournalEntity], type: "postgres" });
		const unbuiltDataSource: DataSource = new DataSource({ entities: [FactoryEntity], type: "postgres" });

		// Metadata is enough for the startup check; the test never connects.
		await (dataSource as unknown as { buildMetadatas: () => Promise<void> }).buildMetadatas();

		const disabled = { generation: { isEnabled: false } };
		const allDisabled = { [EApiRouteType.CREATE]: disabled, [EApiRouteType.DELETE]: disabled, [EApiRouteType.GET]: disabled, [EApiRouteType.GET_LIST]: disabled, [EApiRouteType.PARTIAL_UPDATE]: disabled, [EApiRouteType.UPDATE]: disabled };
		const hook = vi.fn();
		const bootstrap = async (service: unknown, routes: object): Promise<void> => {
			class RepositoryConditionController {
				public service: unknown = service;

				public onApplicationBootstrap(): void {
					hook();
				}
			}

			const Decorated = ApiController<IApiBaseEntity>({ entity: FactoryEntity, routes } as never)(RepositoryConditionController as never) as unknown as new () => { onApplicationBootstrap: () => Promise<void> };

			await new Decorated().onApplicationBootstrap();
		};
		const oneRoute = { ...allDisabled, [EApiRouteType.GET]: {} };
		const throwingService = {
			get repository(): unknown {
				throw new Error("repository getter failed");
			},
		};

		// Every generated route disabled: nothing reads through the repository, so nothing about it is refused and the controller hook still runs.
		for (const service of [undefined, {}, { get: vi.fn() }, { repository: { find: vi.fn() } }, throwingService, { repository: unbuiltDataSource.getRepository(FactoryEntity) }, { repository: dataSource.getRepository(FactoryEntity) }, { repository: dataSource.getRepository(KeyPageJournalEntity) }]) {
			hook.mockClear();
			await expect(bootstrap(service, allDisabled)).resolves.toBeUndefined();
			expect(hook).toHaveBeenCalledOnce();
		}

		// One enabled route: a service double with no repository is refused before the controller hook.
		hook.mockClear();
		await expect(bootstrap({ get: vi.fn() }, oneRoute)).rejects.toThrow('Controller "RepositoryConditionController" of entity "FactoryEntity": service.repository is not a usable TypeORM repository because the service has no repository.');
		await expect(bootstrap(undefined, oneRoute)).rejects.toThrow("because the controller has no service.");
		await expect(bootstrap({ repository: { find: vi.fn() } }, oneRoute)).rejects.toThrow("because its metadata is not TypeORM entity metadata.");
		await expect(bootstrap({ repository: dataSource.getRepository(KeyPageJournalEntity) }, oneRoute)).rejects.toThrow("but its service repository is for KeyPageJournalEntity");
		expect(hook).not.toHaveBeenCalled();
		await expect(bootstrap(createGeneratedServiceDouble(FactoryEntity, dataSource.getRepository(FactoryEntity)), oneRoute)).resolves.toBeUndefined();
		expect(hook).toHaveBeenCalledOnce();

		vi.restoreAllMocks();
	});

	it("names the controller when its repository cannot be read at bootstrap, and accepts a Proxy-wrapped repository", async () => {
		vi.spyOn(LoggerUtility.prototype, "error").mockImplementation((): void => undefined);

		const dataSource: DataSource = new DataSource({ entities: [FactoryEntity], type: "postgres" });
		const disabled = { generation: { isEnabled: false } };
		const oneRoute = { [EApiRouteType.CREATE]: disabled, [EApiRouteType.DELETE]: disabled, [EApiRouteType.GET]: {}, [EApiRouteType.GET_LIST]: disabled, [EApiRouteType.PARTIAL_UPDATE]: disabled, [EApiRouteType.UPDATE]: disabled };
		const bootstrap = async (repository: unknown): Promise<void> => {
			class WrappedController {
				public service: unknown = createGeneratedServiceDouble(FactoryEntity, repository);
			}

			const Decorated = ApiController<IApiBaseEntity>({ entity: FactoryEntity, routes: oneRoute } as never)(WrappedController as never) as unknown as new () => { onApplicationBootstrap: () => Promise<void> };

			await new Decorated().onApplicationBootstrap();
		};
		const repository = dataSource.getRepository(FactoryEntity);

		// The data source has no metadata yet, like a repository whose data source initializes after application bootstrap.
		await expect(bootstrap(repository)).rejects.toThrow(/Controller "WrappedController" of entity "FactoryEntity": service\.repository is not a usable TypeORM repository because reading it failed, usually because its data source is not initialized yet \(.*FactoryEntity.*\)\. In tests/u);

		await (dataSource as unknown as { buildMetadatas: () => Promise<void> }).buildMetadatas();

		const forward = (_target: object, property: PropertyKey): unknown => Reflect.get(repository, property, repository);

		await expect(bootstrap(new Proxy({}, { get: forward }))).resolves.toBeUndefined();
		await expect(bootstrap(new Proxy((): undefined => undefined, { get: forward }))).resolves.toBeUndefined();

		vi.restoreAllMocks();
	});

	it("checks a CURSOR route against the database at bootstrap and names the route, the driver and the guide", async () => {
		vi.spyOn(LoggerUtility.prototype, "error").mockImplementation((): void => undefined);

		const disabled = { generation: { isEnabled: false } };
		const bootstrap = async (type: "better-sqlite3" | "postgres", getList: object): Promise<void> => {
			const dataSource: DataSource = new DataSource({ ...(type === "postgres" ? {} : { database: ":memory:" }), entities: [FactoryEntity], type } as never);

			// Metadata is enough for the startup check; the test never connects.
			await (dataSource as unknown as { buildMetadatas: () => Promise<void> }).buildMetadatas();

			class CursorRouteController {
				public service: { repository: unknown } = { repository: dataSource.getRepository(FactoryEntity) };
			}

			const Decorated = ApiController<IApiBaseEntity>({ entity: FactoryEntity, routes: { [EApiRouteType.CREATE]: disabled, [EApiRouteType.DELETE]: disabled, [EApiRouteType.GET]: disabled, [EApiRouteType.GET_LIST]: getList, [EApiRouteType.PARTIAL_UPDATE]: disabled, [EApiRouteType.UPDATE]: disabled } } as never)(CursorRouteController as never) as unknown as new () => { onApplicationBootstrap: () => Promise<void> };

			await new Decorated().onApplicationBootstrap();
		};
		const cursorRoute = { request: { [EApiControllerRequestTarget.QUERY]: { order: { fields: {}, tieBreakers: [{ direction: EFilterOrderDirection.ASC, field: "id" }], unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT }, pagination: { mode: EApiControllerGetListQueryPaginationMode.CURSOR } } } };

		await expect(bootstrap("better-sqlite3", cursorRoute)).rejects.toThrow('Controller "CursorRouteController" route "getList": CURSOR GET_LIST supports only PostgreSQL; the active driver is "better-sqlite3". In tests, CURSOR needs a PostgreSQL DataSource: https://elsikora.com/docs/nestjs-crud-automator/guides/testing#cursor-controllers');
		await expect(bootstrap("better-sqlite3", {})).resolves.toBeUndefined();
		await expect(bootstrap("better-sqlite3", disabled)).resolves.toBeUndefined();
		await expect(bootstrap("postgres", cursorRoute)).resolves.toBeUndefined();

		vi.restoreAllMocks();
	});
});
