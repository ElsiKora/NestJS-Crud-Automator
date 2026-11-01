import type { IMetadataEntry } from "@interface/class";

import { MetadataStorage } from "@class/metadata-storage.class";
import { PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT } from "@constant/decorator/api";
import { EApiPropertyDescribeType } from "@enum/decorator/api";
import { describe, expect, it } from "vitest";

const KEY = PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY;

describe("MetadataStorage", () => {
	it("stores and retrieves property metadata by key", () => {
		class MetadataEntityStore {}

		const storage = MetadataStorage.getInstance();

		storage.setMetadata(MetadataEntityStore, "name", KEY, {
			type: EApiPropertyDescribeType.STRING,
			description: "entity name",
		});

		const entry = storage.getMetadata(MetadataEntityStore, "name") as IMetadataEntry;
		const properties = storage.getMetadata(MetadataEntityStore, "name", KEY);

		expect(entry).toBeDefined();
		expect(properties).toMatchObject({
			type: EApiPropertyDescribeType.STRING,
		});
	});

	it("returns undefined for missing metadata", () => {
		class UnknownEntity {}

		const storage = MetadataStorage.getInstance();

		expect(storage.getMetadata(UnknownEntity)).toBeUndefined();
		expect(storage.getMetadata(UnknownEntity, "name")).toBeUndefined();
	});

	it("returns each registered class's own metadata keyed by the class", () => {
		class MetadataEntityAggregate {}

		const storage = MetadataStorage.getInstance();

		storage.setMetadata(MetadataEntityAggregate, "title", KEY, {
			type: EApiPropertyDescribeType.STRING,
			description: "title",
		});

		const allMetadata = storage.getAllEntitiesMetadata();

		expect(allMetadata.get(MetadataEntityAggregate)).toHaveProperty("title");
	});

	it("keeps metadata of classes that share one name apart", () => {
		const createClass = (): abstract new () => unknown => class SharedNameEntity {};
		const first = createClass();
		const second = createClass();
		const storage = MetadataStorage.getInstance();

		storage.setMetadata(first, "code", KEY, { description: "first", type: EApiPropertyDescribeType.STRING });
		storage.setMetadata(second, "code", KEY, { description: "second", type: EApiPropertyDescribeType.UUID });

		expect(first.name).toBe(second.name);
		expect(storage.getMetadata(first, "code", KEY)).toMatchObject({ description: "first", type: EApiPropertyDescribeType.STRING });
		expect(storage.getMetadata(second, "code", KEY)).toMatchObject({ description: "second", type: EApiPropertyDescribeType.UUID });
	});

	it("merges a class's metadata with its ancestors' by class identity, nearest class first", () => {
		abstract class LineageBase {}
		abstract class LineageMiddle extends LineageBase {}
		class LineageLeaf extends LineageMiddle {}

		// An unrelated class that only shares the ancestor's name.
		const unrelated = ((): abstract new () => unknown => {
			abstract class LineageBase {}

			return LineageBase;
		})();
		const storage = MetadataStorage.getInstance();

		storage.setMetadata(LineageBase, "code", KEY, { description: "base code", type: EApiPropertyDescribeType.STRING });
		storage.setMetadata(LineageBase, "label", KEY, { description: "base label", type: EApiPropertyDescribeType.STRING });
		storage.setMetadata(LineageMiddle, "label", KEY, { description: "middle label", type: EApiPropertyDescribeType.STRING });
		storage.setMetadata(LineageLeaf, "own", KEY, { description: "own", type: EApiPropertyDescribeType.STRING });
		storage.setMetadata(unrelated, "code", KEY, { description: "unrelated code", type: EApiPropertyDescribeType.UUID });

		expect(storage.getMetadata(LineageLeaf, "code", KEY)).toMatchObject({ description: "base code" });
		expect(storage.getMetadata(LineageLeaf, "label", KEY)).toMatchObject({ description: "middle label" });
		expect(Object.keys(storage.getMetadata(LineageLeaf) ?? {}).toSorted()).toEqual(["code", "label", "own"]);
		expect(storage.getMetadata(LineageLeaf)?.label?.[KEY]).toMatchObject({ description: "middle label" });
		expect(storage.getMetadata(LineageBase, "own")).toBeUndefined();
		expect(storage.getAllEntitiesMetadata().get(LineageLeaf)).toEqual({ own: { [KEY]: { description: "own", type: EApiPropertyDescribeType.STRING } } });
	});
});
