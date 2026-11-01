import { describe, expectTypeOf, it } from "vitest";

// @ts-expect-error The key page loader reads its options internally, so the package root does not export them.
import type { IApiFunctionKeyPageLoaderRead } from "../../../../src/index";
// @ts-expect-error The key page loader walks relations internally, so the package root does not export its state.
import type { IApiFunctionKeyPageLoaderWalk } from "../../../../src/index";

describe("key page loader interfaces", () => {
	it("stay out of the package root", () => {
		// An import of a name the package root does not export resolves to any.
		expectTypeOf<IApiFunctionKeyPageLoaderRead>().toBeAny();
		expectTypeOf<IApiFunctionKeyPageLoaderWalk>().toBeAny();
	});
});
