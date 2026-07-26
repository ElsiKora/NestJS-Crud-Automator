import type { IApiAuthorizationModuleOptions, IApiPolicyDocumentRecord } from "@interface/class/api/authorization";

import { ApiAuthorizationBootstrapValidationService } from "@class/api/authorization/bootstrap-validation.service.class";
import { ApiAuthorizationHookPermissionCache } from "@class/api/authorization/hook";
import { ApiAuthorizationIamAttachmentCache, ApiAuthorizationIamDocumentCache } from "@class/api/authorization/iam";
import { ApiAuthorizationPolicyRegistry } from "@class/api/authorization/policy/registry.class";
import { CONTROLLER_API_DECORATOR_CONSTANT, METHOD_API_DECORATOR_CONSTANT } from "@constant/decorator/api";
import { EApiAuthorizationCacheMode, EApiAuthorizationMode, EApiAuthorizationPrincipalType } from "@enum/class/authorization";
import { RequestMethod } from "@nestjs/common";
import { DiscoveryService } from "@nestjs/core";
import { describe, expect, it, vi } from "vitest";

class ValidationEntity {}

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

	return new ApiAuthorizationBootstrapValidationService(discoveryService, policyRegistry, caches.hookPermission, caches.iamAttachment, caches.iamDocument, [], moduleOptions);
}

describe("ApiAuthorizationBootstrapValidationService", () => {
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

	it("rejects securable custom routes without method-level authorization mode", () => {
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

		expect(() => service.onApplicationBootstrap()).toThrow("method-level authorization mode");
	});
});
