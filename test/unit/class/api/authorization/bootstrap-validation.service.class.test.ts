import { ApiAuthorizationBootstrapValidationService } from "@class/api/authorization/bootstrap-validation.service.class";
import { ApiAuthorizationPolicyRegistry } from "@class/api/authorization/policy/registry.class";
import { CONTROLLER_API_DECORATOR_CONSTANT, METHOD_API_DECORATOR_CONSTANT } from "@constant/decorator/api";
import { EApiAuthorizationMode } from "@enum/class/authorization";
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
				create: { isEnabled: false },
				delete: { isEnabled: false },
				get: { isEnabled: false },
				getList: { isEnabled: false },
				partialUpdate: { isEnabled: false },
				update: { isEnabled: false },
			},
		},
		controller,
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
	it("accepts a custom securable handler with only authorization.action", () => {
		defineSecurableControllerMetadata(ActionOnlyCustomController);
		Reflect.defineMetadata(METHOD_API_DECORATOR_CONSTANT.AUTHORIZATION_METADATA_KEY, { action: "update.publish" }, ActionOnlyCustomController.prototype.publish);

		const service = createService(ActionOnlyCustomController);

		expect(() => service.onApplicationBootstrap()).not.toThrow();
	});

	it("allows duplicate authorization.action values inside one controller", () => {
		defineSecurableControllerMetadata(DuplicateActionController);
		Reflect.defineMetadata(METHOD_API_DECORATOR_CONSTANT.AUTHORIZATION_METADATA_KEY, { action: "update" }, DuplicateActionController.prototype.publish);
		Reflect.defineMetadata(METHOD_API_DECORATOR_CONSTANT.AUTHORIZATION_METADATA_KEY, { action: "update" }, DuplicateActionController.prototype.approve);

		const service = createService(DuplicateActionController);

		expect(() => service.onApplicationBootstrap()).not.toThrow();
	});
});
