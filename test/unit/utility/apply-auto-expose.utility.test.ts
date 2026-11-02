import "reflect-metadata";

import { ApplyAutoExpose } from "@utility/apply-auto-expose.utility";
import { describe, expect, it, vi } from "vitest";

// A bundler that picks the `module` entry of class-transformer leaves the `Expose` decorator writing to another copy of the storage than this utility reads.
vi.mock("class-transformer/cjs/storage.js", () => ({ defaultMetadataStorage: { findExposeMetadata: (): undefined => undefined } }));

class TwoStoragesDto {
	public value?: unknown;
}

describe("ApplyAutoExpose", () => {
	it("fails at decoration when it cannot read what @Expose writes, naming the way out", () => {
		expect(() => {
			ApplyAutoExpose(TwoStoragesDto.prototype, "value");
		}).toThrow("Cannot read class-transformer metadata for 'TwoStoragesDto.value': the bundle loads two copies. Alias exactly 'class-transformer' to 'class-transformer/cjs/index.js', set main before module in the bundler's mainFields, or mark both 'class-transformer' and 'class-transformer/cjs/storage.js' external.");
	});
});
