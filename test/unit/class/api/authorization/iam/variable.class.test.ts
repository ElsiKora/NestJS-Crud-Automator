import type { IApiAuthorizationIamToken, IApiAuthorizationPrincipal } from "@interface/class/api/authorization";

import { ApiAuthorizationIamVariable } from "@class/api/authorization/iam";
import { EApiAuthorizationIamTokenType } from "@enum/class/authorization";
import { describe, expect, it } from "vitest";

const literal = (value: string): IApiAuthorizationIamToken => ({ type: EApiAuthorizationIamTokenType.LITERAL, value });
const variable = (path: string, defaultValue?: string): IApiAuthorizationIamToken => ({ type: EApiAuthorizationIamTokenType.VARIABLE, variable: defaultValue === undefined ? { path } : { defaultValue, path } });
const star: IApiAuthorizationIamToken = { type: EApiAuthorizationIamTokenType.STAR };
const questionMark: IApiAuthorizationIamToken = { type: EApiAuthorizationIamTokenType.QUESTION_MARK };

describe("ApiAuthorizationIamVariable", () => {
	describe("tokenize", () => {
		it.each([
			["", true, []],
			["ns:item/*", true, [literal("ns:item/"), star]],
			["ns:item/?", true, [literal("ns:item/"), questionMark]],
			["ns:item/*", false, [literal("ns:item/*")]],
			["a${*}b${?}c${$}", true, [literal("a*b?c$")]],
			["${principal.id}", false, [variable("principal.id")]],
			["ns:${ principal.id }/*", true, [literal("ns:"), variable("principal.id"), literal("/"), star]],
			["${request.headers.x-tenant-id}", false, [variable("request.headers.x-tenant-id")]],
			["${principal.attributes.team, 'none'}", false, [variable("principal.attributes.team", "none")]],
			["${principal.attributes.team,''}", false, [variable("principal.attributes.team", "")]],
			["$x {y}", false, [literal("$x {y}")]],
		])("reads %s", (text: string, isPattern: boolean, expected: Array<IApiAuthorizationIamToken>) => {
			expect(ApiAuthorizationIamVariable.tokenize(text, isPattern)).toEqual(expected);
		});

		it.each(["${", "${}", "${principal.id", "${.id}", "${principal..id}", "${principal.id, none}", "${principal.id, 'none'", "${principal.id, 'none' x}", "${**}"])("refuses the malformed %s", (text: string) => {
			expect(ApiAuthorizationIamVariable.tokenize(text, true)).toBeUndefined();
		});
	});

	describe("readPath", () => {
		const context = { principal: { attributes: { team: "red" }, id: "user-1" }, request: { parameters: { id: "item-1" } } };

		it.each([
			["principal.id", "user-1"],
			["principal.attributes.team", "red"],
			["request.parameters.id", "item-1"],
			["principal.attributes.missing", undefined],
			["principal.id.length", undefined],
			["resource.status", undefined],
			["principal.attributes.constructor", undefined],
			["principal.attributes.__proto__", undefined],
			["principal.attributes.toString", undefined],
			["principal.attributes.hasOwnProperty", undefined],
		])("reads %s", (path: string, expected: unknown) => {
			expect(ApiAuthorizationIamVariable.readPath(context, path)).toBe(expected);
		});
	});

	describe("resolveValue", () => {
		const context = { principal: { attributes: { level: 3 }, id: "user-1" } };

		it.each([
			[{ parts: [], source: 7 }, 7],
			[{ parts: [], source: true }, true],
			[{ parts: [literal("a*b")], source: "a${*}b" }, "a*b"],
			[{ parts: [], source: "" }, ""],
			[{ parts: [variable("principal.id")], source: "${principal.id}" }, "user-1"],
			[{ parts: [variable("principal.attributes.level")], source: "${principal.attributes.level}" }, 3],
		])("resolves %j", (value: { parts: Array<IApiAuthorizationIamToken>; source: boolean | number | string }, expected: unknown) => {
			expect(ApiAuthorizationIamVariable.resolveValue(value, context)).toBe(expected);
		});

		it.each([
			["text around a variable", { parts: [literal("x-"), variable("principal.id")], source: "x-${principal.id}" }, "x-user-1"],
			["a number inside text", { parts: [literal("l"), variable("principal.attributes.level")], source: "l${principal.attributes.level}" }, "l3"],
			["a present value over its default", { parts: [variable("principal.id", "none")], source: "${principal.id, 'none'}" }, "user-1"],
			["the default of a missing value", { parts: [variable("principal.attributes.missing", "none")], source: "${principal.attributes.missing, 'none'}" }, "none"],
			["the default of an empty value", { parts: [variable("principal.attributes.empty", "none")], source: "${principal.attributes.empty, 'none'}" }, "none"],
			["the default of a list", { parts: [variable("principal.attributes.list", "none")], source: "${principal.attributes.list, 'none'}" }, "none"],
			["the default of NULL", { parts: [variable("principal.attributes.nothing", "none")], source: "${principal.attributes.nothing, 'none'}" }, "none"],
			["the default inside text", { parts: [literal("x-"), variable("principal.attributes.missing", "none")], source: "x-${principal.attributes.missing, 'none'}" }, "x-none"],
		])("reads %s", (_name: string, value: { parts: Array<IApiAuthorizationIamToken>; source: string }, expected: string) => {
			expect(ApiAuthorizationIamVariable.resolveValue(value, { principal: { attributes: { empty: "", level: 3, list: ["a"], nothing: null }, id: "user-1" } })).toBe(expected);
		});

		it.each([
			["a missing value", { parts: [variable("principal.attributes.missing")], source: "${principal.attributes.missing}" }],
			["an empty value", { parts: [variable("principal.attributes.empty")], source: "${principal.attributes.empty}" }],
			["a list", { parts: [variable("principal.attributes.list")], source: "${principal.attributes.list}" }],
			["an object", { parts: [variable("principal.attributes.object")], source: "${principal.attributes.object}" }],
			["NULL", { parts: [variable("principal.attributes.nothing")], source: "${principal.attributes.nothing}" }],
			["a missing value inside text", { parts: [literal("x-"), variable("principal.attributes.missing")], source: "x-${principal.attributes.missing}" }],
			["a row before it is loaded, whatever the default", { parts: [variable("resource.status", "none")], source: "${resource.status, 'none'}" }],
		])("does not resolve %s", (_name: string, value: { parts: Array<IApiAuthorizationIamToken>; source: string }) => {
			expect(ApiAuthorizationIamVariable.resolveValue(value, { principal: { attributes: { empty: "", list: ["a"], nothing: null, object: { a: 1 } } } })).toBeUndefined();
		});

		it("keeps the type of a variable that stands alone", () => {
			const time: Date = new Date("2024-01-01T00:00:00.000Z");

			expect(ApiAuthorizationIamVariable.resolveValue({ parts: [variable("request.time")], source: "${request.time}" }, { request: { time } })).toBe(time);
		});
	});

	describe("resolveTokens", () => {
		it("keeps a wildcard a variable holds as literal text", () => {
			expect(ApiAuthorizationIamVariable.resolveTokens([literal("item/"), variable("principal.id"), { type: EApiAuthorizationIamTokenType.STAR }], { principal: { id: "a*?" } })).toEqual([literal("item/"), literal("a*?"), { type: EApiAuthorizationIamTokenType.STAR }]);
		});

		it("gives nothing when a variable does not resolve", () => {
			expect(ApiAuthorizationIamVariable.resolveTokens([literal("item/"), variable("principal.id")], { principal: {} })).toBeUndefined();
		});
	});

	describe("createContext", () => {
		it("lower-cases the header names, as Node reads them", () => {
			const context: Record<string, unknown> = ApiAuthorizationIamVariable.createContext({ id: "user-1" } as IApiAuthorizationPrincipal, { headers: { "X-Foo": "bad" } } as never);

			expect(ApiAuthorizationIamVariable.readPath(context, "request.headers.x-foo")).toBe("bad");
			expect(ApiAuthorizationIamVariable.readPath(context, "request.headers.X-Foo")).toBeUndefined();
		});

		it("exposes the source address and the time of the request", () => {
			const time: Date = new Date("2024-01-01T00:00:00.000Z");
			const context: Record<string, unknown> = ApiAuthorizationIamVariable.createContext({ id: "user-1" } as IApiAuthorizationPrincipal, { ip: "10.0.0.1", time });

			expect(ApiAuthorizationIamVariable.readPath(context, "request.sourceIp")).toBe("10.0.0.1");
			expect(ApiAuthorizationIamVariable.readPath(context, "request.time")).toBe(time);
		});
	});
});
