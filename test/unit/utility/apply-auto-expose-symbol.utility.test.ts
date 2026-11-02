import "reflect-metadata";

import { ApplyAutoExpose } from "@utility/apply-auto-expose.utility";
import { Expose } from "class-transformer";
import { defaultMetadataStorage } from "class-transformer/cjs/storage.js";
import { describe, expect, it } from "vitest";

const VALUE_KEY: unique symbol = Symbol("value");

describe("ApplyAutoExpose on a symbol property", () => {
	it("exposes the property under its own key", () => {
		class SymbolDto {}

		ApplyAutoExpose(SymbolDto.prototype, VALUE_KEY);

		expect(defaultMetadataStorage.findExposeMetadata(SymbolDto, VALUE_KEY)).toBeDefined();
	});

	it("keeps an explicit @Expose", () => {
		class SymbolDto {}

		Expose({ name: "wire" })(SymbolDto.prototype, VALUE_KEY);
		ApplyAutoExpose(SymbolDto.prototype, VALUE_KEY);

		expect(defaultMetadataStorage.findExposeMetadata(SymbolDto, VALUE_KEY)).toMatchObject({ options: { name: "wire" } });
	});
});
