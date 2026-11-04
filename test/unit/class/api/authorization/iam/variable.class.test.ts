import type { IApiAuthorizationIamToken } from "@interface/class/api/authorization";

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
			["an embedded variable", { parts: [literal("x-"), variable("principal.id")], source: "x-${principal.id}" }],
			["a default", { parts: [variable("principal.id", "none")], source: "${principal.id, 'none'}" }],
		])("refuses %s", (_name: string, value: { parts: Array<IApiAuthorizationIamToken>; source: string }) => {
			expect(() => ApiAuthorizationIamVariable.resolveValue(value, context)).toThrow("uses a variable form the engine does not evaluate yet");
		});
	});
});
