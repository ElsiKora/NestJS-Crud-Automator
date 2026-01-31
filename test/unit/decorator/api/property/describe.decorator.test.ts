import "reflect-metadata";

import { MetadataStorage } from "@class/metadata-storage.class";
import { PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT } from "@constant/decorator/api";
import { ApiPropertyDescribe } from "@decorator/api/property/describe.decorator";
import { EApiPropertyDescribeType, EApiPropertyNumberType, EApiPropertyStringType } from "@enum/decorator/api";
import { describe, expect, it } from "vitest";

class DescribeEntity {
	@ApiPropertyDescribe({
		description: "label",
		exampleValue: "Label",
		format: EApiPropertyStringType.STRING,
		maxLength: 100,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public label!: string;

	@ApiPropertyDescribe({
		description: "count",
		exampleValue: 1,
		format: EApiPropertyNumberType.INTEGER,
		maximum: 10,
		minimum: 1,
		multipleOf: 1,
		type: EApiPropertyDescribeType.NUMBER,
	})
	public count!: number;
}

describe("ApiPropertyDescribe", () => {
	it("stores property metadata in MetadataStorage", () => {
		const metadata = MetadataStorage.getInstance().getMetadata(DescribeEntity.name, "label", PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY);

		expect(metadata).toBeDefined();
		expect(metadata?.type).toBe(EApiPropertyDescribeType.STRING);
	});

	it("stores separate metadata entries per property", () => {
		const labelMetadata = MetadataStorage.getInstance().getMetadata(DescribeEntity.name, "label", PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY);
		const countMetadata = MetadataStorage.getInstance().getMetadata(DescribeEntity.name, "count", PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY);

		expect(labelMetadata?.type).toBe(EApiPropertyDescribeType.STRING);
		expect(countMetadata?.type).toBe(EApiPropertyDescribeType.NUMBER);
	});
});
