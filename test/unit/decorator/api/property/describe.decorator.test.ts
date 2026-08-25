import "reflect-metadata";

import { MetadataStorage } from "@class/metadata-storage.class";
import { PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT } from "@constant/decorator/api";
import { ApiPropertyDescribe } from "@decorator/api/property/describe.decorator";
import { EApiPropertyDescribeType, EApiPropertyNumberType, EApiPropertyStringType } from "@enum/decorator/api";
import { describe, expect, it } from "vitest";

class DescribeEntity {
	@ApiPropertyDescribe({
		description: "internal reference",
		exampleValue: "internal-1",
		format: EApiPropertyStringType.STRING,
		isAutoDtoEnabled: false,
		maxLength: 100,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public internalReference!: string;

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
		isAutoDtoEnabled: true,
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
		expect(metadata?.isAutoDtoEnabled).toBeUndefined();
	});

	it("stores explicit auto-DTO visibility without removing property metadata", () => {
		const internalReferenceMetadata = MetadataStorage.getInstance().getMetadata(DescribeEntity.name, "internalReference", PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY);
		const labelMetadata = MetadataStorage.getInstance().getMetadata(DescribeEntity.name, "label", PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY);
		const countMetadata = MetadataStorage.getInstance().getMetadata(DescribeEntity.name, "count", PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY);

		expect(internalReferenceMetadata).toMatchObject({
			description: "internal reference",
			isAutoDtoEnabled: false,
			type: EApiPropertyDescribeType.STRING,
		});
		expect(labelMetadata?.type).toBe(EApiPropertyDescribeType.STRING);
		expect(countMetadata?.type).toBe(EApiPropertyDescribeType.NUMBER);
		expect(countMetadata?.isAutoDtoEnabled).toBe(true);
	});
});
