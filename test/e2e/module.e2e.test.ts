import "reflect-metadata";

import { MODULE_METADATA } from "@nestjs/common/constants";
import { DiscoveryModule } from "@nestjs/core";
import { describe, expect, it } from "vitest";

import { ApiAuthorizationEngine, ApiAuthorizationGuard, ApiAuthorizationModule, ApiAuthorizationPolicyDiscoveryService, ApiAuthorizationPolicyRegistry, ApiSubscriberDiscoveryService, ApiSubscriberModule, AUTHORIZATION_POLICY_REGISTRY_TOKEN } from "../../dist/esm/index";

describe("Module metadata (E2E)", () => {
	it("exposes providers and exports for ApiAuthorizationModule", () => {
		const providers = Reflect.getMetadata(MODULE_METADATA.PROVIDERS, ApiAuthorizationModule) as Array<unknown>;
		const exportsList = Reflect.getMetadata(MODULE_METADATA.EXPORTS, ApiAuthorizationModule) as Array<unknown>;
		const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, ApiAuthorizationModule) as Array<unknown>;

		expect(providers).toEqual(expect.arrayContaining([ApiAuthorizationEngine, ApiAuthorizationGuard, ApiAuthorizationPolicyDiscoveryService]));
		expect(providers.some((provider: any) => provider?.provide === AUTHORIZATION_POLICY_REGISTRY_TOKEN)).toBe(true);
		expect(providers.some((provider: any) => provider?.provide === ApiAuthorizationPolicyRegistry)).toBe(true);
		expect(exportsList).toEqual(expect.arrayContaining([AUTHORIZATION_POLICY_REGISTRY_TOKEN, ApiAuthorizationEngine, ApiAuthorizationGuard, ApiAuthorizationPolicyDiscoveryService]));
		expect(imports).toEqual(expect.arrayContaining([DiscoveryModule]));
	});

	it("exposes providers and exports for ApiSubscriberModule", () => {
		const providers = Reflect.getMetadata(MODULE_METADATA.PROVIDERS, ApiSubscriberModule) as Array<unknown>;
		const exportsList = Reflect.getMetadata(MODULE_METADATA.EXPORTS, ApiSubscriberModule) as Array<unknown>;
		const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, ApiSubscriberModule) as Array<unknown>;

		expect(providers).toEqual(expect.arrayContaining([ApiSubscriberDiscoveryService]));
		expect(exportsList).toEqual(expect.arrayContaining([ApiSubscriberDiscoveryService]));
		expect(imports).toEqual(expect.arrayContaining([DiscoveryModule]));
	});
});
