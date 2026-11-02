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
import { EApiDtoType, EApiPropertyDescribeType, EApiPropertyNumberType, EApiRouteType } from "@enum/decorator/api";
import { RequestMethod } from "@nestjs/common";
import { PATH_METADATA } from "@nestjs/common/internal";
import { DiscoveryService, MetadataScanner, ModulesContainer } from "@nestjs/core";
import { Entity, PrimaryGeneratedColumn } from "typeorm";
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

	it("forgets the path value rules of an earlier start", () => {
		const registry: ApiAuthorizationParametersRuleRegistry = new ApiAuthorizationParametersRuleRegistry();
		registry.set(InheritedRouteFirstController, InheritedAccessorController, { dto: ValidationParametersDto });

		createService().onApplicationBootstrap();
		createIamService([], registry).onApplicationBootstrap();

		expect(registry.get(InheritedRouteFirstController, InheritedAccessorController)).toBeUndefined();
	});
});
