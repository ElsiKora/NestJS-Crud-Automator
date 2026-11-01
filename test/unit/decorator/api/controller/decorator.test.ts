import "reflect-metadata";

import type { IApiBaseEntity } from "@interface/api-base-entity.interface";

import { ApiServiceBase } from "@class/api";
import { ApiControllerGeneratedFunctionCapability } from "@class/api/controller/generated/function-capability.class";
import { ApiControllerGeneratedReadScopeStorage } from "@class/api/controller/generated/read-scope-storage.class";
import { CONTROLLER_API_DECORATOR_CONSTANT } from "@constant/decorator/api/controller.constant";
import { ApiController } from "@decorator/api/controller/decorator";
import { ApiControllerObservable } from "@decorator/api/controller/observable.decorator";
import { ApiControllerSecurable } from "@decorator/api/controller/securable.decorator";
import { ApiPropertyDescribe } from "@decorator/api/property/describe.decorator";
import { EApiDtoType, EApiFunctionType, EApiPropertyDescribeType, EApiPropertyNumberType, EApiPropertyStringType, EApiRouteType } from "@enum/decorator/api";
import { ApiProperty } from "@nestjs/swagger";
import { KeyPageAccountEntity } from "@test/unit/class/api/function/fixture/key-page-account.entity";
import { KeyPageAuditorEntity } from "@test/unit/class/api/function/fixture/key-page-auditor.entity";
import { KeyPageBatchEntity } from "@test/unit/class/api/function/fixture/key-page-batch.entity";
import { KeyPageEntryEntity } from "@test/unit/class/api/function/fixture/key-page-entry.entity";
import { KeyPageHolderEntity } from "@test/unit/class/api/function/fixture/key-page-holder.entity";
import { KeyPageJournalEntity } from "@test/unit/class/api/function/fixture/key-page-journal.entity";
import { KeyPageReceiptEntity } from "@test/unit/class/api/function/fixture/key-page-receipt.entity";
import { LoggerUtility } from "@utility/logger.utility";
import { Column, DataSource, Entity, PrimaryGeneratedColumn } from "typeorm";
import { describe, expect, it, vi } from "vitest";

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
	public override create = vi.fn(async (properties: Partial<FactoryEntity>) => ({ id: properties.id ?? "id-1", name: properties.name ?? "created", count: 1 }) as FactoryEntity);
	public override get = vi.fn(async (properties: { where?: Partial<FactoryEntity> }) => {
		ApiControllerGeneratedReadScopeStorage.claim(EApiFunctionType.GET, properties);

		return { id: properties.where?.id ?? "id-1", name: "found", count: 2 } as FactoryEntity;
	});
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
		const headers: Record<string, string> = {};
		const ip = "127.0.0.1";

		await controller.create({ id: "id-1", name: "created", count: 1 }, headers, ip);
		await controller.get({ id: "id-1" }, headers, ip);
		await controller.getList({ limit: 10, page: 1 }, headers, ip);
		await controller.update({ id: "id-1" }, { name: "updated" }, headers, ip);
		await controller.partialUpdate({ id: "id-1" }, { name: "patched" }, headers, ip);
		await controller.delete({ id: "id-1" }, headers, ip);

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

		class JournalController {
			public service: { repository: unknown } = { repository: dataSource.getRepository(KeyPageJournalEntity) };

			public onApplicationBootstrap(): void {
				hook();
			}
		}

		const createController = (getRoute: object): { onApplicationBootstrap: () => Promise<void> } => {
			const Decorated = ApiController<IApiBaseEntity>({
				entity: FactoryEntity,
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
			class CheckedController {
				public service: { repository: unknown } = { repository: dataSource.getRepository(entity) };
			}

			const Decorated = ApiController<IApiBaseEntity>({ entity: FactoryEntity, routes } as never)(CheckedController as never) as unknown as new () => { onApplicationBootstrap: () => Promise<void> };

			await new Decorated().onApplicationBootstrap();
		};
		const { [EApiRouteType.GET]: _get, ...withoutGet } = allDisabled;
		const requestLoad = (locks?: object): object => ({ ...allDisabled, [EApiRouteType.CREATE]: { relations: { request: { load: { include: { receipt: true }, ...(locks ? { locks } : {}) }, reference: { key: "id", shape: "id" } } } } });

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

		it("fails startup for two controller classes with the same name and names both paths", () => {
			const createController = (): { new (): { service: FactoryService } } =>
				class SchemaNameDuplicateController {
					public service: FactoryService = new FactoryService();
				};

			ApiController<IApiBaseEntity>({ entity: FactoryEntity, path: "admin/schema-name-duplicates", routes: getOnlyRoutes })(createController());

			expect(() => ApiController<IApiBaseEntity>({ entity: FactoryEntity, path: "schema-name-duplicates", routes: getOnlyRoutes })(createController())).toThrow('Controllers SchemaNameDuplicateController (path "admin/schema-name-duplicates") and SchemaNameDuplicateController (path "schema-name-duplicates") have the same schema prefix "SchemaNameDuplicate"');
		});

		it("fails startup for an anonymous controller class", () => {
			const anonymousController: { new (): { service: FactoryService } } = (() =>
				class {
					public service: FactoryService = new FactoryService();
				})();

			expect(anonymousController.name).toBe("");
			expect(() => ApiController<IApiBaseEntity>({ entity: FactoryEntity, path: "schema-name-anonymous", routes: getOnlyRoutes })(anonymousController)).toThrow('Controller with path "schema-name-anonymous" is an anonymous class');
		});

		it("fails startup when two generated DTO classes get the same name", () => {
			class SchemaNameOrderController {
				public service: FactoryService = new FactoryService();
			}

			class SchemaNameOrderListController {
				public service: FactoryService = new FactoryService();
			}

			class SchemaNameOrderItemDto {}

			ApiController<IApiBaseEntity>({ entity: FactoryEntity, path: "schema-name-orders", routes: getOnlyRoutes })(SchemaNameOrderController);

			expect(() =>
				ApiController<IApiBaseEntity>({
					entity: FactoryEntity,
					path: "schema-name-order-lists",
					routes: { ...getOnlyRoutes, [EApiRouteType.GET]: { generation: { isEnabled: false } }, [EApiRouteType.GET_LIST]: { dto: { response: { itemType: SchemaNameOrderItemDto, name: "SchemaNameOrderGetResponseDTO" } } } },
				})(SchemaNameOrderListController),
			).toThrow('OpenAPI component name "SchemaNameOrderGetResponseDTO" belongs to two different classes: the get response DTO of controller prefix "SchemaNameOrder", and the getList page response of controller prefix "SchemaNameOrderList"');
		});
		it("fails startup for two controller classes with one prefix on one path", () => {
			class SchemaNameSamePathController {
				public service: FactoryService = new FactoryService();
			}

			class SchemaNameSamePath {
				public service: FactoryService = new FactoryService();
			}

			ApiController<IApiBaseEntity>({ entity: FactoryEntity, path: "schema-name-same-path", routes: getOnlyRoutes })(SchemaNameSamePathController);

			expect(() => ApiController<IApiBaseEntity>({ entity: FactoryEntity, path: "schema-name-same-path", routes: getOnlyRoutes })(SchemaNameSamePath)).toThrow('Controllers SchemaNameSamePathController (path "schema-name-same-path") and SchemaNameSamePath (path "schema-name-same-path") have the same schema prefix "SchemaNameSamePath"');
		});

		it("fails startup when a hand-written DTO has the name of a generated DTO of another controller", () => {
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

			ApiController<IApiBaseEntity>({ entity: FactoryEntity, path: "schema-name-w1", routes: getOnlyRoutes })(SchemaNameW1Controller);

			expect(() =>
				ApiController<IApiBaseEntity>({
					entity: FactoryEntity,
					path: "schema-name-w2",
					routes: { ...getOnlyRoutes, [EApiRouteType.GET]: { dto: { [EApiDtoType.RESPONSE]: SchemaNameW1GetResponseDTO } } },
				})(SchemaNameW2Controller),
			).toThrow('OpenAPI component name "SchemaNameW1GetResponseDTO" belongs to two different classes: the get response DTO of controller prefix "SchemaNameW1", and the get response DTO of controller prefix "SchemaNameW2"');
		});
	});
});
