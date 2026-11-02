import { ClassTransformerReadLimits } from "@utility/class-transformer/read-limits.utility";
import { describe, expect, it, vi } from "vitest";

vi.mock("class-transformer/cjs/storage.js", () => ({ defaultMetadataStorage: { findExposeMetadata: (): undefined => undefined, findTransformMetadatas: (): Array<never> => [] } }));

class TwoStoragesDto {
	public value?: string;
}

describe("ClassTransformerReadLimits", () => {
	it("fails when the bundled class-transformer and its storage are different copies, instead of finding no limit", () => {
		expect(() => ClassTransformerReadLimits(TwoStoragesDto, "value")).toThrow("Cannot read class-transformer metadata for 'TwoStoragesDto.value': the bundle loads two copies");
	});
});
