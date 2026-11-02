import { describe, expectTypeOf, it } from "vitest";

// @ts-expect-error The path value parser reads column values internally, so the package root does not export them.
import type { IApiControllerParametersColumnValue } from "../../../../src/index";
// @ts-expect-error Custom route rules are built internally, so the package root does not export their options.
import type { IApiControllerParametersCustomRuleOptions } from "../../../../src/index";
// @ts-expect-error Path value rules are built and read internally, so the package root does not export them.
import type { IApiControllerParametersRule } from "../../../../src/index";
// @ts-expect-error The copied source column of a path value is read internally, so the package root does not export it.
import type { IApiControllerParametersSource } from "../../../../src/index";
// @ts-expect-error The safe integer range check reads its options internally, so the package root does not export them.
import type { INumberIntegerRange } from "../../../../src/index";

describe("path value rule interfaces", () => {
	it("stay out of the package root", () => {
		// An import of a name the package root does not export resolves to any.
		expectTypeOf<IApiControllerParametersColumnValue>().toBeAny();
		expectTypeOf<IApiControllerParametersCustomRuleOptions>().toBeAny();
		expectTypeOf<IApiControllerParametersRule>().toBeAny();
		expectTypeOf<IApiControllerParametersSource>().toBeAny();
		expectTypeOf<INumberIntegerRange>().toBeAny();
	});
});
