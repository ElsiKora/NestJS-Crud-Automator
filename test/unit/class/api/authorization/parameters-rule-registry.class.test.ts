import type { IApiControllerParametersRule } from "@interface/class/api/controller";

import { ApiAuthorizationParametersRuleRegistry } from "@class/api/authorization/parameters-rule-registry.class";
import { describe, expect, it } from "vitest";

class RegistryFirstDto {}

class RegistrySecondDto {}

class RegistryFirstController {}

class RegistrySecondController {}

function registryHandler(): void {}

function registryOtherHandler(): void {}

describe("ApiAuthorizationParametersRuleRegistry", () => {
	it("keeps one rule for each controller class and handler, so subclasses sharing an inherited handler keep their own rules", () => {
		const registry: ApiAuthorizationParametersRuleRegistry = new ApiAuthorizationParametersRuleRegistry();
		const firstRule: IApiControllerParametersRule = { dto: RegistryFirstDto };
		const secondRule: IApiControllerParametersRule = { dto: RegistrySecondDto };

		registry.set(RegistryFirstController, registryHandler, firstRule);
		registry.set(RegistrySecondController, registryHandler, secondRule);

		expect(registry.get(RegistryFirstController, registryHandler)).toBe(firstRule);
		expect(registry.get(RegistrySecondController, registryHandler)).toBe(secondRule);
		expect(registry.get(RegistryFirstController, registryOtherHandler)).toBeUndefined();
		expect(registry.get(RegistryFirstDto, registryHandler)).toBeUndefined();
	});

	it("forgets every rule when cleared", () => {
		const registry: ApiAuthorizationParametersRuleRegistry = new ApiAuthorizationParametersRuleRegistry();

		registry.set(RegistryFirstController, registryHandler, { dto: RegistryFirstDto });
		registry.clear();

		expect(registry.get(RegistryFirstController, registryHandler)).toBeUndefined();
	});
});
