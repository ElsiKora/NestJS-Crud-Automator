import { EApiRouteType } from "@enum/decorator/api";
import { ApiControllerParametersAssertResourcePathPlaceholders } from "@utility/api/controller/parameters/resource-path.utility";
import { describe, expect, it } from "vitest";

const ROUTE: string = 'Controller "ResourcePathController" method "route"';

describe("ApiControllerParametersAssertResourcePathPlaceholders", () => {
	it.each([EApiRouteType.GET, EApiRouteType.UPDATE, EApiRouteType.PARTIAL_UPDATE, EApiRouteType.DELETE])("fails at startup on a %s route whose path lacks a resourcePath placeholder, because the placeholder would render as * and miss every Deny on a value", (routeType: EApiRouteType) => {
		expect(() => ApiControllerParametersAssertResourcePathPlaceholders({ action: "admin:item:anything", pathParameters: ["id"], policyNamespace: "admin:item", resourcePath: "item/t{tenant}/{id}", route: ROUTE, routeType })).toThrow(`${ROUTE} names "{tenant}" in its IAM resourcePath, which is not a path parameter of the route, and a route that neither lists nor creates renders it as "*", so no Deny on a value of it matches`);
	});

	it("fails at startup on a route without a type whose action neither lists nor creates, and names the list advice in full", () => {
		expect(() => ApiControllerParametersAssertResourcePathPlaceholders({ action: "admin:item:export", pathParameters: [], policyNamespace: "admin:item", resourcePath: "item/{id}", route: ROUTE, routeType: undefined })).toThrow('whose handler must apply decision.scope.where to its query and whose IAM action becomes "<policyNamespace>:list", so a separate action such as "export" is granted and denied as list');
	});

	it.each([
		["a GET_LIST route", EApiRouteType.GET_LIST, "admin:item:export"],
		["a CREATE route", EApiRouteType.CREATE, "admin:item:provision"],
		["a route without a type whose action is list", undefined, "admin:item:list"],
		["a route without a type whose action is create", undefined, "admin:item:create"],
	])("keeps %s whose path lacks a resourcePath placeholder, because IAM evaluates it as a list or a create", (_case: string, routeType: EApiRouteType | undefined, action: string) => {
		expect(() => ApiControllerParametersAssertResourcePathPlaceholders({ action, pathParameters: [], policyNamespace: "admin:item", resourcePath: "item/t{tenant}/{id}", route: ROUTE, routeType })).not.toThrow();
	});

	it("keeps a route whose path carries every resourcePath placeholder", () => {
		expect(() => ApiControllerParametersAssertResourcePathPlaceholders({ action: "admin:item:read", pathParameters: ["tenant", "id"], policyNamespace: "admin:item", resourcePath: "item/t{tenant}/{id}", route: ROUTE, routeType: EApiRouteType.GET })).not.toThrow();
	});
});
