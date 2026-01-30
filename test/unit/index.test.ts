import { describe, expect, it } from "vitest";

describe("index exports", () => {
	it("should export core modules, decorators, and utilities", async () => {
		const indexExports = await import("../../src/index");

		expect(indexExports).toHaveProperty("ApiAuthorizationModule");
		expect(indexExports).toHaveProperty("ApiSubscriberModule");
		expect(indexExports).toHaveProperty("ApiAuthorizationEngine");
		expect(indexExports).toHaveProperty("ApiAuthorizationPolicyRegistry");
		expect(indexExports).toHaveProperty("ApiPropertyDescribe");
		expect(indexExports).toHaveProperty("EApiRouteType");
		expect(indexExports).toHaveProperty("AuthorizationDecisionApplyResult");
		expect(indexExports).toHaveProperty("IsRegularExpressionValidator");
	});
});
