import { ApiControllerParametersReadPath } from "@utility/api/controller/parameters/read-path.utility";
import { describe, expect, it } from "vitest";

const ROUTE: string = 'Controller "ReadPathController" method "read"';

describe("ApiControllerParametersReadPath", () => {
	it.each([
		["express", "items/\\:x/:id", ["id"]],
		["fastify", "items/\\:x/:id", ["x", "id"]],
		[undefined, "items/\\:x/:id", ["id", "x"]],
		["express", "items/a::b/:id", ["id"]],
		["fastify", "items/a::b/:id", ["id"]],
		[undefined, "items/a::b/:id", ["id"]],
		["express", 'items/:"tenant id"/:id', ["tenant id", "id"]],
		["fastify", "items/:from-:to/:id", ["from", "to", "id"]],
		["fastify", "items/:id(^\\d+$).json", ["id"]],
		["fastify", "items/:id(a:b)/:code", ["id", "code"]],
	])("reads the parameters %s serves under %s", (adapterType: string | undefined, path: string, expected: Array<string>) => {
		expect(ApiControllerParametersReadPath(path, ROUTE, adapterType)).toEqual(expected);
	});

	it.each([
		["express", "items/*rest"],
		["fastify", "items/*"],
		["fastify", "items/\\*"],
		[undefined, "items/\\*"],
	])("refuses a wildcard %s serves under %s", (adapterType: string | undefined, path: string) => {
		expect(() => ApiControllerParametersReadPath(path, ROUTE, adapterType)).toThrow(`${ROUTE} is served under the wildcard path "${path}"`);
	});

	it("reads an escaped star as text on Express", () => {
		expect(ApiControllerParametersReadPath("items/\\*/:id", ROUTE, "express")).toEqual(["id"]);
	});

	it("reads each name once across the parts of a path", () => {
		expect(ApiControllerParametersReadPath(["orgs/:org", "", "items/:id", "copy/:id"], ROUTE, "fastify")).toEqual(["org", "id"]);
	});
});
