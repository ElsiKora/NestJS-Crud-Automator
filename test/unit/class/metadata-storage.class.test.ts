import type { IMetadataEntry } from "@interface/class";

import { MetadataStorage } from "@class/metadata-storage.class";
import { PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT } from "@constant/decorator/api";
import { EApiPropertyDescribeType } from "@enum/decorator/api";
import { describe, expect, it } from "vitest";

describe("MetadataStorage", () => {
	it("stores and retrieves property metadata by key", () => {
		const storage = MetadataStorage.getInstance();
		const entityName = "MetadataEntityStore";

		storage.setMetadata(entityName, "name", PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY, {
			type: EApiPropertyDescribeType.STRING,
			description: "entity name",
		});

		const entry = storage.getMetadata(entityName, "name") as IMetadataEntry;
		const properties = storage.getMetadata(entityName, "name", PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY);

		expect(entry).toBeDefined();
		expect(properties).toMatchObject({
			type: EApiPropertyDescribeType.STRING,
		});
	});

	it("returns undefined for missing metadata", () => {
		const storage = MetadataStorage.getInstance();
		const missing = storage.getMetadata("UnknownEntity");

		expect(missing).toBeUndefined();
	});

	it("returns all entity metadata in aggregate", () => {
		const storage = MetadataStorage.getInstance();
		const entityName = "MetadataEntityAggregate";

		storage.setMetadata(entityName, "title", PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY, {
			type: EApiPropertyDescribeType.STRING,
			description: "title",
		});

		const allMetadata = storage.getAllEntitiesMetadata();

		expect(allMetadata).toHaveProperty(entityName);
		expect(allMetadata[entityName]).toHaveProperty("title");
	});
});
