import { ApiAuthorizationBootstrapValidationService } from "@class/api/authorization/bootstrap-validation.service.class";
import { ApiAuthorizationPolicyRegistry } from "@class/api/authorization/policy/registry.class";
import { CONTROLLER_API_DECORATOR_CONSTANT, METHOD_API_DECORATOR_CONSTANT } from "@constant/decorator/api";
import { EApiAuthorizationMode } from "@enum/class/authorization";
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

function createService(controller: new () => unknown): ApiAuthorizationBootstrapValidationService {
	const discoveryService = {
		getControllers: vi.fn(() => [{ metatype: controller }]),
	} as unknown as DiscoveryService;
	const policyRegistry = {
		hasSubscriberForEntity: vi.fn(() => true),
	} as unknown as ApiAuthorizationPolicyRegistry;

	return new ApiAuthorizationBootstrapValidationService(discoveryService, policyRegistry);
}

describe("ApiAuthorizationBootstrapValidationService", () => {
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
