import { describe, expect, it } from "vitest";

describe("index exports", () => {
	it("should export core modules, decorators, and utilities", async () => {
		const indexExports = await import("../../src/index");

		expect(indexExports).toHaveProperty("ApiAuthorizationModule");
		expect(indexExports).toHaveProperty("ApiSubscriberModule");
		expect(indexExports).toHaveProperty("ApiAuthorizationEngine");
		expect(indexExports).toHaveProperty("ApiAuthorizationPolicyRegistry");
		expect(indexExports).toHaveProperty("ApiPropertyDescribe");
		expect(indexExports).toHaveProperty("ApiRequestValidationException");
		expect(indexExports).toHaveProperty("ApiRequestValidationGetErrors");
		expect(indexExports).toHaveProperty("EApiRouteGuardStage");
		expect(indexExports).toHaveProperty("EApiRouteType");
		expect(indexExports).toHaveProperty("AuthorizationDecisionApplyResult");
		expect(indexExports).toHaveProperty("CorrelationIDNormalizeException");
		expect(indexExports).toHaveProperty("CorrelationIDResponseBodyExceptionFilter");
		expect(indexExports).not.toHaveProperty("CorrelationIDBuildException");
		expect(indexExports).not.toHaveProperty("CorrelationIDResolve");
		expect(indexExports).toHaveProperty("FormatErrorEvidenceForLog");
		expect(indexExports).toHaveProperty("IsRegularExpressionValidator");
		expect(indexExports).not.toHaveProperty("ApiControllerAssertRouteCursorDataSource");
		expect(indexExports).not.toHaveProperty("ApiControllerAssertRouteRelationLoads");
		expect(indexExports).not.toHaveProperty("DatabaseTypeOrmGetRepositoryGap");
		expect(indexExports).not.toHaveProperty("DatabaseTypeOrmIsRepository");
	});
});
