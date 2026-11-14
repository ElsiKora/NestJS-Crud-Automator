import type { IApiAuthorizationModuleOptions, IApiPolicyDocumentRecord } from "@interface/class/api/authorization";
import type { IApiControllerParametersRule } from "@interface/class/api/controller/parameters-rule.interface";

import { ApiAuthorizationBootstrapValidationService } from "@class/api/authorization/bootstrap-validation.service.class";
import { ApiAuthorizationHookPermissionCache } from "@class/api/authorization/hook";
import { ApiAuthorizationIamAttachmentCache, ApiAuthorizationIamDocumentCache } from "@class/api/authorization/iam";
import { ApiAuthorizationParametersRuleRegistry } from "@class/api/authorization/parameters-rule-registry.class";
import { ApiAuthorizationPolicyRegistry } from "@class/api/authorization/policy/registry.class";
import { CONTROLLER_API_DECORATOR_CONSTANT, METHOD_API_DECORATOR_CONSTANT } from "@constant/decorator/api";
import { ApiPropertyCopy } from "@decorator/api/property/copy.decorator";
import { ApiPropertyDescribe } from "@decorator/api/property/describe.decorator";
import { EApiAuthorizationCacheMode, EApiAuthorizationMode, EApiAuthorizationPrincipalType } from "@enum/class/authorization";
import { EApiDtoType, EApiPropertyDescribeType, EApiPropertyNumberType, EApiPropertyStringType, EApiRouteType } from "@enum/decorator/api";
import { RequestMethod } from "@nestjs/common";
import { PATH_METADATA } from "@nestjs/common/internal";
import { DiscoveryService, MetadataScanner, ModulesContainer } from "@nestjs/core";
import { Column, Entity, JoinTable, ManyToMany, ManyToOne, OneToMany, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";
import { describe, expect, it, vi } from "vitest";

@Entity("bootstrap_validation_entities")
class ValidationEntity {
	@PrimaryGeneratedColumn("increment")
	@ApiPropertyDescribe({
		description: "id",
		exampleValue: 1,
		format: EApiPropertyNumberType.INTEGER,
		maximum: 1_000_000,
		minimum: 1,
		multipleOf: 1,
		type: EApiPropertyDescribeType.NUMBER,
	})
	public id!: number;
}

@Entity("bootstrap_validation_labels")
class ValidationLabelEntity {
	@PrimaryColumn({ type: "varchar" })
	public id!: string;

	@Column({ type: "varchar" })
	public name!: string;
}

@Entity("bootstrap_validation_owners")
class ValidationOwnerEntity {
	@PrimaryColumn({ type: "varchar" })
	public id!: string;

	@JoinTable()
	@ManyToMany(() => ValidationLabelEntity)
	public labels!: Array<ValidationLabelEntity>;

	@Column({ type: "varchar" })
	public name!: string;
}

// An entity with a to-one relation that leads on to a ManyToMany, and a OneToMany of its own.
@Entity("bootstrap_validation_collection_entities")
class ValidationCollectionEntity {
	@PrimaryColumn({ type: "varchar" })
	public id!: string;

	@ManyToOne(() => ValidationOwnerEntity)
	public owner!: ValidationOwnerEntity;

	@OneToMany(() => ValidationNoteEntity, (note: ValidationNoteEntity) => note.item)
	public notes!: Array<ValidationNoteEntity>;
}

@Entity("bootstrap_validation_notes")
class ValidationNoteEntity {
	@PrimaryColumn({ type: "varchar" })
	public id!: string;

	@ManyToOne(() => ValidationCollectionEntity, (item: ValidationCollectionEntity) => item.notes)
	public item!: ValidationCollectionEntity;

	@Column({ type: "varchar" })
	public text!: string;
}

@Entity("bootstrap_validation_decimal_entities")
class ValidationDecimalEntity {
	@PrimaryColumn({ precision: 10, scale: 2, type: "decimal" })
	@ApiPropertyDescribe({ description: "amount", exampleValue: "1.50", format: EApiPropertyStringType.STRING, maxLength: 32, minLength: 1, pattern: String.raw`/^\d+(\.\d+)?$/`, type: EApiPropertyDescribeType.STRING })
	public amount!: string;
}

class ValidationDecimalParametersDto {
	@ApiPropertyCopy({ dtoType: EApiDtoType.PARAMETERS, entity: () => ValidationDecimalEntity, method: EApiRouteType.GET, propertyName: "amount" })
	public amount!: string;
}

class HooksDecimalRouteController {
	public read(): void {}
}

class ValidationParametersDto {
	@ApiPropertyCopy({ dtoType: EApiDtoType.PARAMETERS, entity: () => ValidationEntity, method: EApiRouteType.GET, propertyName: "id" })
	public id!: number;
}

class InheritedRouteBaseController {
	public read(): void {}
}

class InheritedRouteFirstController extends InheritedRouteBaseController {}

class InheritedRouteSecondController extends InheritedRouteBaseController {}

class InheritedRouteOverrideController extends InheritedRouteBaseController {
	public override read(): void {}
}

class InheritedMissingModeBaseController {
	public publish(): void {}
}

class InheritedMissingModeController extends InheritedMissingModeBaseController {}

class InheritedAccessorBaseController {
	protected get tableName(): string {
		throw new Error("The accessor ran during startup");
	}
}

class InheritedAccessorController extends InheritedAccessorBaseController {}

class DuplicateActionController {
	public approve(): void {}

	public publish(): void {}
}

class ActionOnlyCustomController {
	public publish(): void {}
}

class MissingCustomAuthorizationController {
	public publish(): void {}
}

function defineSecurableControllerMetadata(controller: new () => unknown): void {
	Reflect.defineMetadata(CONTROLLER_API_DECORATOR_CONSTANT.SECURABLE_METADATA_KEY, true, controller);
	Reflect.defineMetadata(
		CONTROLLER_API_DECORATOR_CONSTANT.PROPERTIES_METADATA_KEY,
		{
			authorization: {
				defaultMode: EApiAuthorizationMode.HOOKS,
			},
			entity: ValidationEntity,
			routes: {
				create: { generation: { isEnabled: false } },
				delete: { generation: { isEnabled: false } },
				get: { generation: { isEnabled: false } },
				getList: { generation: { isEnabled: false } },
				partialUpdate: { generation: { isEnabled: false } },
				update: { generation: { isEnabled: false } },
			},
		},
		controller,
	);
}

function defineRouteMetadata(handler: () => void, action: string): void {
	Reflect.defineMetadata(
		METHOD_API_DECORATOR_CONSTANT.ROUTE_METADATA_KEY,
		{
			resource: {
				action,
				entity: ValidationEntity,
			},
			route: {
				method: RequestMethod.POST,
				path: "",
			},
			security: {
				authorization: {
					mode: EApiAuthorizationMode.HOOKS,
				},
			},
		},
		handler,
	);
}

function defineIamControllerMetadata(controller: new () => unknown, resourcePath: string): void {
	Reflect.defineMetadata(CONTROLLER_API_DECORATOR_CONSTANT.SECURABLE_METADATA_KEY, true, controller);
	Reflect.defineMetadata(PATH_METADATA, "items/:id", controller);
	Reflect.defineMetadata(
		CONTROLLER_API_DECORATOR_CONSTANT.PROPERTIES_METADATA_KEY,
		{
			authorization: {
				defaultMode: EApiAuthorizationMode.IAM,
				policyNamespace: "validation",
				resourceDefinition: { entity: ValidationEntity, fields: [], namespace: "validation", resourcePath, resourceType: "validation" },
			},
			entity: ValidationEntity,
			routes: {
				create: { generation: { isEnabled: false } },
				delete: { generation: { isEnabled: false } },
				get: { generation: { isEnabled: false } },
				getList: { generation: { isEnabled: false } },
				partialUpdate: { generation: { isEnabled: false } },
				update: { generation: { isEnabled: false } },
			},
		},
		controller,
	);
}

// An IAM controller over the collection entity whose only route is the generated GET.
function defineCollectionControllerMetadata(controller: new () => unknown, fields: Array<{ isFilterable: boolean; path: string; queryPath: string }>, resourcePath: string = "validation/{id}"): void {
	Reflect.defineMetadata(CONTROLLER_API_DECORATOR_CONSTANT.SECURABLE_METADATA_KEY, true, controller);
	Reflect.defineMetadata(
		CONTROLLER_API_DECORATOR_CONSTANT.PROPERTIES_METADATA_KEY,
		{
			authorization: {
				defaultMode: EApiAuthorizationMode.IAM,
				policyNamespace: "validation",
				resourceDefinition: { entity: ValidationCollectionEntity, fields, namespace: "validation", resourcePath, resourceType: "validation" },
			},
			entity: ValidationCollectionEntity,
			routes: {
				create: { generation: { isEnabled: false } },
				delete: { generation: { isEnabled: false } },
				getList: { generation: { isEnabled: false } },
				partialUpdate: { generation: { isEnabled: false } },
				update: { generation: { isEnabled: false } },
			},
		},
		controller,
	);
}

// An IAM controller over the label entity, which has the columns `id` and `name`, whose only route is the generated GET, so only its resource definition is checked.
function defineRouteBoundControllerMetadata(controller: new () => unknown, resourceDefinition: { fields?: Array<{ isFilterable: boolean; path: string; queryPath: string }>; resourcePath: string; routeParameters?: unknown }, pathScope?: { parameters: Array<{ field: string; parameter: string }> }): void {
	Reflect.defineMetadata(CONTROLLER_API_DECORATOR_CONSTANT.SECURABLE_METADATA_KEY, true, controller);
	Reflect.defineMetadata(
		CONTROLLER_API_DECORATOR_CONSTANT.PROPERTIES_METADATA_KEY,
		{
			authorization: {
				defaultMode: EApiAuthorizationMode.IAM,
				policyNamespace: "validation",
				resourceDefinition: { entity: ValidationLabelEntity, fields: [], namespace: "validation", resourceType: "validation:setting", ...resourceDefinition },
			},
			entity: ValidationLabelEntity,
			...(pathScope ? { pathScope } : {}),
			routes: {
				create: { generation: { isEnabled: false } },
				delete: { generation: { isEnabled: false } },
				getList: { generation: { isEnabled: false } },
				partialUpdate: { generation: { isEnabled: false } },
				update: { generation: { isEnabled: false } },
			},
		},
		controller,
	);
}

function defineIamRouteMetadata(handler: () => void): void {
	Reflect.defineMetadata(
		METHOD_API_DECORATOR_CONSTANT.ROUTE_METADATA_KEY,
		{
			resource: { action: "read", entity: ValidationEntity },
			route: { method: RequestMethod.GET, path: "" },
			security: { authorization: { mode: EApiAuthorizationMode.IAM } },
		},
		handler,
	);
	Reflect.defineMetadata(METHOD_API_DECORATOR_CONSTANT.ROUTE_RUNTIME_PROPERTIES_METADATA_KEY, { dto: { [EApiDtoType.PARAMETERS]: ValidationParametersDto } }, handler);
}

function createIamService(controllers: Array<new () => unknown>, registry: ApiAuthorizationParametersRuleRegistry): ApiAuthorizationBootstrapValidationService {
	const discoveryService = {
		getControllers: vi.fn(() => controllers.map((controller: new () => unknown) => ({ metatype: controller }))),
	} as unknown as DiscoveryService;
	const policyRegistry = {
		hasSubscriberForEntity: vi.fn(() => true),
	} as unknown as ApiAuthorizationPolicyRegistry;

	return new ApiAuthorizationBootstrapValidationService(discoveryService, new MetadataScanner(), new ModulesContainer(), policyRegistry, new ApiAuthorizationHookPermissionCache(), new ApiAuthorizationIamAttachmentCache(), new ApiAuthorizationIamDocumentCache(), [{}], {}, registry);
}

function createService(
	controller?: new () => unknown,
	moduleOptions: IApiAuthorizationModuleOptions = {},
	caches: {
		hookPermission: ApiAuthorizationHookPermissionCache;
		iamAttachment: ApiAuthorizationIamAttachmentCache;
		iamDocument: ApiAuthorizationIamDocumentCache;
	} = {
		hookPermission: new ApiAuthorizationHookPermissionCache(),
		iamAttachment: new ApiAuthorizationIamAttachmentCache(),
		iamDocument: new ApiAuthorizationIamDocumentCache(),
	},
): ApiAuthorizationBootstrapValidationService {
	const discoveryService = {
		getControllers: vi.fn(() => (controller ? [{ metatype: controller }] : [])),
	} as unknown as DiscoveryService;
	const policyRegistry = {
		hasSubscriberForEntity: vi.fn(() => true),
	} as unknown as ApiAuthorizationPolicyRegistry;

	return new ApiAuthorizationBootstrapValidationService(discoveryService, new MetadataScanner(), new ModulesContainer(), policyRegistry, caches.hookPermission, caches.iamAttachment, caches.iamDocument, [], moduleOptions, new ApiAuthorizationParametersRuleRegistry());
}

describe("ApiAuthorizationBootstrapValidationService", () => {
	it("refuses to be built without the path value rule registry", () => {
		expect(() => new ApiAuthorizationBootstrapValidationService({} as never, {} as never, {} as never, {} as never, new ApiAuthorizationHookPermissionCache(), new ApiAuthorizationIamAttachmentCache(), new ApiAuthorizationIamDocumentCache(), [], {}, undefined as never)).toThrow("ApiAuthorizationBootstrapValidationService needs ApiAuthorizationParametersRuleRegistry");
	});

	it("accepts source-first cache mode by default and when explicit", () => {
		const caches = {
			hookPermission: new ApiAuthorizationHookPermissionCache(),
			iamAttachment: new ApiAuthorizationIamAttachmentCache(),
			iamDocument: new ApiAuthorizationIamDocumentCache(),
		};
		const principal = { attributes: {}, id: "source-first-user", roles: [], type: EApiAuthorizationPrincipalType.USER };

		expect(() => createService(undefined, {}, caches).onApplicationBootstrap()).not.toThrow();

		caches.hookPermission.set(principal, ["read"]);
		caches.iamAttachment.set(principal, { attachments: [], boundaries: [] });
		caches.iamDocument.set(["policy-a"], []);

		expect(caches.hookPermission.get(principal)).toBeUndefined();
		expect(caches.iamAttachment.get(principal)).toBeUndefined();
		expect(caches.iamDocument.get(["policy-a"])).toBeUndefined();
		expect(() =>
			createService(undefined, {
				cache: {
					mode: EApiAuthorizationCacheMode.SOURCE_FIRST,
				},
			}).onApplicationBootstrap(),
		).not.toThrow();
	});

	it("accepts bounded MEMORY cache options", () => {
		const caches = {
			hookPermission: new ApiAuthorizationHookPermissionCache(),
			iamAttachment: new ApiAuthorizationIamAttachmentCache(),
			iamDocument: new ApiAuthorizationIamDocumentCache(),
		};
		const principal = { attributes: {}, id: "memory-user", roles: [], type: EApiAuthorizationPrincipalType.USER };
		const attachments = { attachments: [], boundaries: [] };
		const documents: ReadonlyArray<IApiPolicyDocumentRecord> = [];
		const service = createService(
			undefined,
			{
				cache: {
					maxEntries: 100,
					mode: EApiAuthorizationCacheMode.MEMORY,
					ttlMs: 60_000,
				},
			},
			caches,
		);

		expect(() => service.onApplicationBootstrap()).not.toThrow();

		caches.hookPermission.set(principal, ["read"]);
		caches.iamAttachment.set(principal, attachments);
		caches.iamDocument.set(["policy-a"], documents);

		expect(caches.hookPermission.get(principal)).toEqual(["read"]);
		expect(caches.iamAttachment.get(principal)).toBe(attachments);
		expect(caches.iamDocument.get(["policy-a"])).toBe(documents);
	});

	it("rejects MEMORY cache options without a positive safe maxEntries", () => {
		const service = createService(undefined, {
			cache: {
				maxEntries: 0,
				mode: EApiAuthorizationCacheMode.MEMORY,
				ttlMs: 60_000,
			},
		});

		expect(() => service.onApplicationBootstrap()).toThrow("maxEntries must be a positive safe integer");
	});

	it("rejects MEMORY cache options without a positive safe ttlMs", () => {
		const service = createService(undefined, {
			cache: {
				maxEntries: 100,
				mode: EApiAuthorizationCacheMode.MEMORY,
				ttlMs: 0,
			},
		});

		expect(() => service.onApplicationBootstrap()).toThrow("ttlMs must be a positive safe integer");
	});

	it("rejects unknown authorization cache modes", () => {
		const service = createService(undefined, {
			cache: {
				mode: "distributed",
			},
		} as unknown as IApiAuthorizationModuleOptions);

		expect(() => service.onApplicationBootstrap()).toThrow('Unknown authorization cache mode "distributed"');
	});

	it("accepts a custom securable handler with only route metadata action", () => {
		defineSecurableControllerMetadata(ActionOnlyCustomController);
		defineRouteMetadata(ActionOnlyCustomController.prototype.publish, "update.publish");

		const service = createService(ActionOnlyCustomController);

		expect(() => service.onApplicationBootstrap()).not.toThrow();
	});

	it("allows duplicate route metadata action values inside one controller", () => {
		defineSecurableControllerMetadata(DuplicateActionController);
		defineRouteMetadata(DuplicateActionController.prototype.publish, "update");
		defineRouteMetadata(DuplicateActionController.prototype.approve, "update");

		const service = createService(DuplicateActionController);

		expect(() => service.onApplicationBootstrap()).not.toThrow();
	});

	it("accepts securable custom routes without method-level authorization mode, which resolve to the controller default", () => {
		defineSecurableControllerMetadata(MissingCustomAuthorizationController);
		Reflect.defineMetadata(
			METHOD_API_DECORATOR_CONSTANT.ROUTE_METADATA_KEY,
			{
				resource: {
					action: "publish",
					entity: ValidationEntity,
				},
				route: {
					method: RequestMethod.POST,
					path: "",
				},
			},
			MissingCustomAuthorizationController.prototype.publish,
		);

		const service = createService(MissingCustomAuthorizationController);

		expect(() => service.onApplicationBootstrap()).not.toThrow();
	});

	it("resolves a route inherited from a base class without a mode to the controller default", () => {
		defineSecurableControllerMetadata(InheritedMissingModeController);
		Reflect.defineMetadata(
			METHOD_API_DECORATOR_CONSTANT.ROUTE_METADATA_KEY,
			{
				resource: { action: "publish", entity: ValidationEntity },
				route: { method: RequestMethod.POST, path: "" },
			},
			InheritedMissingModeBaseController.prototype.publish,
		);

		expect(() => createService(InheritedMissingModeController).onApplicationBootstrap()).not.toThrow();
	});

	it("starts without running an accessor inherited by a securable controller", () => {
		defineSecurableControllerMetadata(InheritedAccessorController);

		expect(() => createService(InheritedAccessorController).onApplicationBootstrap()).not.toThrow();
	});

	it("keeps the path value rule of an inherited custom route for each controller, and the override of a subclass for its own handler", () => {
		const registry: ApiAuthorizationParametersRuleRegistry = new ApiAuthorizationParametersRuleRegistry();
		defineIamRouteMetadata(InheritedRouteBaseController.prototype.read);
		defineIamRouteMetadata(InheritedRouteOverrideController.prototype.read);
		defineIamControllerMetadata(InheritedRouteFirstController, "first/{id}");
		defineIamControllerMetadata(InheritedRouteSecondController, "second/item");
		defineIamControllerMetadata(InheritedRouteOverrideController, "override/{id}");

		createIamService([InheritedRouteFirstController, InheritedRouteSecondController, InheritedRouteOverrideController], registry).onApplicationBootstrap();

		const firstRule: IApiControllerParametersRule | undefined = registry.get(InheritedRouteFirstController, InheritedRouteBaseController.prototype.read);
		const secondRule: IApiControllerParametersRule | undefined = registry.get(InheritedRouteSecondController, InheritedRouteBaseController.prototype.read);

		expect(firstRule).toBeDefined();
		expect(secondRule).toBeDefined();
		expect(secondRule).not.toBe(firstRule);
		expect(registry.get(InheritedRouteOverrideController, InheritedRouteOverrideController.prototype.read)).toBeDefined();
		expect(registry.get(InheritedRouteOverrideController, InheritedRouteBaseController.prototype.read)).toBeUndefined();
	});

	it("does not start a HOOKS custom route that holds a path value in a decimal column, because a policy compares context.parameters as text", () => {
		defineSecurableControllerMetadata(HooksDecimalRouteController);
		Reflect.defineMetadata(PATH_METADATA, "amounts/:amount", HooksDecimalRouteController);
		defineRouteMetadata(HooksDecimalRouteController.prototype.read, "read");
		Reflect.defineMetadata(METHOD_API_DECORATOR_CONSTANT.ROUTE_RUNTIME_PROPERTIES_METADATA_KEY, { dto: { [EApiDtoType.PARAMETERS]: ValidationDecimalParametersDto } }, HooksDecimalRouteController.prototype.read);

		expect(() => createIamService([HooksDecimalRouteController], new ApiAuthorizationParametersRuleRegistry()).onApplicationBootstrap()).toThrow('Controller "HooksDecimalRouteController" method "read" holds the path parameter "amount" in the decimal column "amount"');
	});

	it.each([
		["a OneToMany relation to a further relation", "resource.noteItem", "notes.item.id", "notes"],
		["a ManyToMany relation behind a to-one relation", "resource.ownerLabel", "owner.labels.name", "owner.labels"],
	])("does not start a resource field whose query path crosses %s", (_name: string, path: string, queryPath: string, collectionPath: string) => {
		class CollectionFieldController {}

		defineCollectionControllerMetadata(CollectionFieldController, [
			{ isFilterable: true, path: "resource.ownerName", queryPath: "owner.name" },
			{ isFilterable: true, path, queryPath },
		]);

		expect(() => {
			createIamService([CollectionFieldController], new ApiAuthorizationParametersRuleRegistry()).onApplicationBootstrap();
		}).toThrow(`Controller "CollectionFieldController" resource field "${path}" queryPath "${queryPath}" crosses the to-many relation "${collectionPath}"; map a column of the resource, of a to-one relation, or of a to-many relation of the resource itself`);
	});

	it("starts a resource field that maps a column of a to-many relation of the resource", () => {
		class ToManyFieldController {}

		defineCollectionControllerMetadata(ToManyFieldController, [{ isFilterable: true, path: "resource.noteText", queryPath: "notes.text" }]);

		expect(() => {
			createIamService([ToManyFieldController], new ApiAuthorizationParametersRuleRegistry()).onApplicationBootstrap();
		}).not.toThrow();
	});

	it("does not start a resource path whose placeholder reads a to-many relation, which has no one value to render", () => {
		class ToManyPlaceholderController {}

		defineCollectionControllerMetadata(ToManyPlaceholderController, [{ isFilterable: true, path: "resource.noteText", queryPath: "notes.text" }], "validation/{noteText}");

		expect(() => {
			createIamService([ToManyPlaceholderController], new ApiAuthorizationParametersRuleRegistry()).onApplicationBootstrap();
		}).toThrow('Controller "ToManyPlaceholderController" resource path placeholder "noteText" reads the to-many relation "notes", which holds no one value to render');
	});

	it("starts a resource field whose query path crosses only to-one relations", () => {
		class ToOneFieldController {}

		defineCollectionControllerMetadata(ToOneFieldController, [{ isFilterable: true, path: "resource.ownerName", queryPath: "owner.name" }]);

		expect(() => {
			createIamService([ToOneFieldController], new ApiAuthorizationParametersRuleRegistry()).onApplicationBootstrap();
		}).not.toThrow();
	});

	describe("route-bound placeholders", () => {
		const start = (controller: new () => unknown): void => {
			createIamService([controller], new ApiAuthorizationParametersRuleRegistry()).onApplicationBootstrap();
		};

		it("starts a placeholder listed in routeParameters that names no column, beside a field of the entity", () => {
			class RouteBoundController {}

			defineRouteBoundControllerMetadata(RouteBoundController, { fields: [{ isFilterable: true, path: "resource.name", queryPath: "name" }], resourcePath: "validation:setting/{settingId}", routeParameters: ["settingId"] });

			expect(() => start(RouteBoundController)).not.toThrow();
		});

		it("does not start a route-bound placeholder whose name is a column of the entity, which a Deny must be checked on", () => {
			class RouteBoundColumnNameController {}

			defineRouteBoundControllerMetadata(RouteBoundColumnNameController, { resourcePath: "validation:setting/{id}", routeParameters: ["id"] });

			expect(() => start(RouteBoundColumnNameController)).toThrow('Controller "RouteBoundColumnNameController" resource "validation:setting" path placeholder "{id}" is listed in resourceDefinition.routeParameters and is also the column "id" of entity "ValidationLabelEntity", and one placeholder reads one value: remove "id" from routeParameters to compare the column, whose stored row a Deny is checked on');
		});

		it("starts a placeholder that reads a column of the entity, a field or a path scope binding, without routeParameters", () => {
			class ColumnController {}
			class FieldController {}
			class BindingController {}

			defineRouteBoundControllerMetadata(ColumnController, { resourcePath: "validation:setting/{id}" });
			defineRouteBoundControllerMetadata(FieldController, { fields: [{ isFilterable: true, path: "resource.key", queryPath: "name" }], resourcePath: "validation:setting/{key}" });
			defineRouteBoundControllerMetadata(BindingController, { resourcePath: "validation:setting/{key}" }, { parameters: [{ field: "name", parameter: "key" }] });

			expect(() => start(ColumnController)).not.toThrow();
			expect(() => start(FieldController)).not.toThrow();
			expect(() => start(BindingController)).not.toThrow();
		});

		it("does not start a placeholder that reads neither a route parameter nor a column, and names the three fixes", () => {
			class NoColumnController {}

			defineRouteBoundControllerMetadata(NoColumnController, { fields: [{ isFilterable: true, path: "resource.name", queryPath: "name" }], resourcePath: "validation:setting/{settingId}" });

			expect(() => start(NoColumnController)).toThrow(
				'Controller "NoColumnController" resource "validation:setting" path placeholder "{settingId}" of "validation:setting/{settingId}" reads no column of entity "ValidationLabelEntity" through "settingId", so every statement that names one resource would fail closed: map it to a column with a field "resource.settingId", bind the path parameter "settingId" to a column in pathScope, or list "settingId" in resourceDefinition.routeParameters to compare the text of the route parameter',
			);
		});

		it("does not start a placeholder whose field or path scope binding ends on no column", () => {
			class MissingFieldColumnController {}
			class MissingBindingColumnController {}

			defineRouteBoundControllerMetadata(MissingFieldColumnController, { fields: [{ isFilterable: true, path: "resource.key", queryPath: "missing" }], resourcePath: "validation:setting/{key}" });
			defineRouteBoundControllerMetadata(MissingBindingColumnController, { resourcePath: "validation:setting/{key}" }, { parameters: [{ field: "missing", parameter: "key" }] });

			expect(() => start(MissingFieldColumnController)).toThrow('path placeholder "{key}" of "validation:setting/{key}" reads no column of entity "ValidationLabelEntity" through "missing"');
			expect(() => start(MissingBindingColumnController)).toThrow('path placeholder "{key}" of "validation:setting/{key}" reads no column of entity "ValidationLabelEntity" through "missing"');
		});

		it("does not start a routeParameters entry that is not a placeholder of the resource path", () => {
			class UnknownRouteParameterController {}

			defineRouteBoundControllerMetadata(UnknownRouteParameterController, { resourcePath: "validation:setting/{id}", routeParameters: ["settingId"] });

			expect(() => start(UnknownRouteParameterController)).toThrow('Controller "UnknownRouteParameterController" resource "validation:setting" resourceDefinition.routeParameters names "settingId", which is not a placeholder of "validation:setting/{id}": list only placeholders of the resource path, such as "id" for "{id}"');
		});

		it("does not start a routeParameters entry listed twice, or routeParameters that is not a list", () => {
			class TwiceController {}
			class NotListController {}

			defineRouteBoundControllerMetadata(TwiceController, { resourcePath: "validation:setting/{settingId}", routeParameters: ["settingId", "settingId"] });
			defineRouteBoundControllerMetadata(NotListController, { resourcePath: "validation:setting/{settingId}", routeParameters: "settingId" });

			expect(() => start(TwiceController)).toThrow('Controller "TwiceController" resource "validation:setting" resourceDefinition.routeParameters lists "settingId" twice');
			expect(() => start(NotListController)).toThrow('Controller "NotListController" resource "validation:setting" resourceDefinition.routeParameters must be a list of placeholders of "validation:setting/{settingId}"');
		});

		it("does not start a route-bound placeholder that a field also maps", () => {
			class FieldAndRouteController {}

			defineRouteBoundControllerMetadata(FieldAndRouteController, { fields: [{ isFilterable: true, path: "resource.id", queryPath: "id" }], resourcePath: "validation:setting/{id}", routeParameters: ["id"] });

			expect(() => start(FieldAndRouteController)).toThrow('Controller "FieldAndRouteController" resource "validation:setting" path placeholder "{id}" is listed in resourceDefinition.routeParameters and also mapped by the field "resource.id" to "id", and one placeholder reads one value: remove "id" from routeParameters to compare the column, or remove the field to compare the text of the route parameter');
		});

		it("does not start a route-bound placeholder that the path scope also binds", () => {
			class BindingAndRouteController {}

			defineRouteBoundControllerMetadata(BindingAndRouteController, { resourcePath: "validation:setting/{key}", routeParameters: ["key"] }, { parameters: [{ field: "name", parameter: "key" }] });

			expect(() => start(BindingAndRouteController)).toThrow('Controller "BindingAndRouteController" resource "validation:setting" path placeholder "{key}" is listed in resourceDefinition.routeParameters and also bound by pathScope to "name", and one placeholder reads one value: remove "key" from routeParameters to compare the column, or remove the pathScope binding to compare the text of the route parameter');
		});
	});

	it("forgets the path value rules of an earlier start", () => {
		const registry: ApiAuthorizationParametersRuleRegistry = new ApiAuthorizationParametersRuleRegistry();
		registry.set(InheritedRouteFirstController, InheritedAccessorController, { dto: ValidationParametersDto });

		createService().onApplicationBootstrap();
		createIamService([], registry).onApplicationBootstrap();

		expect(registry.get(InheritedRouteFirstController, InheritedAccessorController)).toBeUndefined();
	});
});
