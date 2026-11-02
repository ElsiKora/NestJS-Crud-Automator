import { EApiRouteType } from "@enum/decorator/api";
import { AuthorizationIsCreateRoute } from "@utility/authorization/is-create-route.utility";
import { describe, expect, it } from "vitest";

describe("AuthorizationIsCreateRoute", () => {
	it.each([
		[EApiRouteType.CREATE, "admin:item:provision", "admin:item", true],
		[undefined, "admin:item:create", "admin:item", true],
		[EApiRouteType.GET, "admin:item:create", "admin:item", false],
		[undefined, "admin:item:read", "admin:item", false],
		[undefined, ":create", undefined, false],
	])("reads route type %s with action %s in namespace %s as a create: %s", (routeType: EApiRouteType | undefined, action: string, policyNamespace: string | undefined, isCreate: boolean) => {
		expect(AuthorizationIsCreateRoute(routeType, action, policyNamespace)).toBe(isCreate);
	});
});
