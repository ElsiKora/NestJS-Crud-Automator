import type { IApiControllerParametersRule } from "@interface/class/api/controller/parameters-rule.interface";

import "reflect-metadata";

import { ApiPropertyCopy } from "@decorator/api/property/copy.decorator";
import { ApiPropertyDescribe } from "@decorator/api/property/describe.decorator";
import { ApiPropertyNumber } from "@decorator/api/property/number.decorator";
import { ApiPropertyUUID } from "@decorator/api/property/uuid.decorator";
import { EApiDtoType, EApiPropertyDescribeType, EApiPropertyNumberType, EApiPropertyStringType, EApiRouteType } from "@enum/decorator/api";
import { ApiControllerParametersBuildCustomRule } from "@utility/api/controller/parameters/custom-rule.utility";
import { ApiControllerParametersValidate } from "@utility/api/controller/parameters/validate.utility";
import { Exclude, Expose, Transform, Type } from "class-transformer";
import { IsDefined, IsString, IsUUID, ValidateNested } from "class-validator";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { describe, expect, it } from "vitest";

@Entity("custom_rule_items")
class CustomRuleItemEntity {
	@PrimaryGeneratedColumn("increment")
	@ApiPropertyDescribe({
		description: "id",
		exampleValue: 1,
		format: EApiPropertyNumberType.INTEGER,
		maximum: 1_000_000,
		minimum: 1,
		multipleOf: 1,
		type: EApiPropertyDescribeType.NUMBER,
	})
	public id!: number;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "name",
		exampleValue: "Name",
		format: EApiPropertyStringType.STRING,
		maxLength: 50,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public name!: string;
}

class CustomRuleParametersDto {
	@ApiPropertyCopy({ dtoType: EApiDtoType.PARAMETERS, entity: () => CustomRuleItemEntity, method: EApiRouteType.GET, propertyName: "id" })
	public id!: number;
}

class CustomRuleDescribedParametersDto {
	@ApiPropertyNumber({ description: "id", entity: CustomRuleItemEntity, exampleValue: 1, format: EApiPropertyNumberType.INTEGER, isRequired: true, maximum: 1_000_000, minimum: 0, multipleOf: 1 })
	public id!: number;

	@ApiPropertyUUID({ description: "owner", entity: CustomRuleItemEntity, isRequired: true })
	public owner!: string;
}

class CustomRuleUndescribedParametersDto {
	public id!: number;
}

class CustomRuleRenamedCopyParametersDto {
	@Expose({ name: "id" })
	@ApiPropertyCopy({ dtoType: EApiDtoType.PARAMETERS, entity: () => CustomRuleItemEntity, method: EApiRouteType.GET, propertyName: "id" })
	public internalId!: number;
}

class CustomRuleObjectResultParametersDto {
	@IsDefined()
	@Transform(({ value }: { value: unknown }): unknown => ({ value }), { toClassOnly: true })
	public id!: unknown;
}

class CustomRuleListParametersDto {
	@ApiPropertyNumber({ description: "id", entity: CustomRuleItemEntity, exampleValue: [1], format: EApiPropertyNumberType.INTEGER, isArray: true, isRequired: true, isUniqueItems: false, maxItems: 3, maximum: 1_000_000, minimum: 0, minItems: 1, multipleOf: 1 })
	public id!: Array<number>;
}

class CustomRuleNestedValueDto {
	@IsString()
	public value!: string;
}

class CustomRuleNestedParametersDto {
	@Type(() => CustomRuleNestedValueDto)
	@ValidateNested()
	public id!: CustomRuleNestedValueDto;
}

class CustomRuleExcludedParametersDto {
	@Exclude()
	public id!: string;
}

class CustomRuleThrowingParametersDto {
	@IsUUID()
	@Transform(({ value }: { value: string }): string => {
		if (value === "1") {
			throw new Error("Not a value this route takes");
		}

		return value;
	})
	public id!: string;
}

class CustomRuleResponseParametersDto {
	@ApiPropertyNumber({ description: "id", entity: CustomRuleItemEntity, exampleValue: 1, format: EApiPropertyNumberType.INTEGER, isRequired: true, isResponse: true, maximum: 1_000_000, minimum: 0, multipleOf: 1 } as never)
	public id!: number;
}

class CustomRuleController {}

describe("ApiControllerParametersBuildCustomRule", () => {
	it("checks a described path value that the resource path does not name, so a policy condition on it sees canonical text", async () => {
		const rule: IApiControllerParametersRule | undefined = ApiControllerParametersBuildCustomRule({ controller: CustomRuleController, dto: CustomRuleParametersDto, methodName: "conditionOnly", pathParameters: ["id"], resourcePath: "custom-rule/item" });

		expect(rule).toBeDefined();
		await expect(ApiControllerParametersValidate(rule!, { id: "16" } as never)).resolves.toEqual({ id: 16 });
		await expect(ApiControllerParametersValidate(rule!, { id: "016" } as never)).rejects.toThrow();
	});

	it("checks a path value the DTO describes without copying a column, by the DTO's own rule", async () => {
		const rule: IApiControllerParametersRule | undefined = ApiControllerParametersBuildCustomRule({ controller: CustomRuleController, dto: CustomRuleDescribedParametersDto, methodName: "describedOnly", pathParameters: ["id", "owner"], resourcePath: "custom-rule/item" });
		const owner: string = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

		expect(rule).toBeDefined();
		await expect(ApiControllerParametersValidate(rule!, { id: "16", owner: owner.toUpperCase() } as never)).resolves.toEqual({ id: 16, owner });

		for (const id of ["016", "1e1", "abc"]) {
			await expect(ApiControllerParametersValidate(rule!, { id, owner } as never)).rejects.toThrow();
		}
	});

	it("builds no rule for a route with no path parameter or no PARAMETERS DTO, so it costs nothing per request", () => {
		expect(ApiControllerParametersBuildCustomRule({ controller: CustomRuleController, dto: CustomRuleParametersDto, methodName: "noParameter", pathParameters: [], resourcePath: "custom-rule/item" })).toBeUndefined();
		expect(ApiControllerParametersBuildCustomRule({ controller: CustomRuleController, dto: undefined, methodName: "noDto", pathParameters: ["id"], resourcePath: "custom-rule/item" })).toBeUndefined();
		expect(ApiControllerParametersBuildCustomRule({ controller: CustomRuleController, dto: undefined, methodName: "noDtoNamed", pathParameters: [], resourcePath: "custom-rule/{id}" })).toBeUndefined();
	});

	it("keeps a path parameter the DTO does not describe as sent", async () => {
		const rule: IApiControllerParametersRule | undefined = ApiControllerParametersBuildCustomRule({ controller: CustomRuleController, dto: CustomRuleUndescribedParametersDto, methodName: "undescribed", pathParameters: ["id"], resourcePath: "custom-rule/item" });

		await expect(ApiControllerParametersValidate(rule!, { id: "016" } as never)).resolves.toEqual({ id: "016" });
	});

	it("rejects a resource path placeholder that names an undescribed path parameter", () => {
		expect(() => ApiControllerParametersBuildCustomRule({ controller: CustomRuleController, dto: CustomRuleUndescribedParametersDto, methodName: "named", pathParameters: ["id"], resourcePath: "custom-rule/{id}" })).toThrow('Controller "CustomRuleController" method "named" names the path parameter "id"');
	});

	it("names the rule a scalar described placeholder misses, since the DTO does describe it", () => {
		expect(() => ApiControllerParametersBuildCustomRule({ controller: CustomRuleController, dto: CustomRuleDescribedParametersDto, methodName: "scalarNamed", pathParameters: ["id"], resourcePath: "custom-rule/{id}" })).toThrow("must copy that value from an entity column with ApiPropertyCopy");
		expect(() => ApiControllerParametersBuildCustomRule({ controller: CustomRuleController, dto: CustomRuleDescribedParametersDto, methodName: "scalarNamed", pathParameters: ["id"], resourcePath: "custom-rule/{id}" })).not.toThrow("does not describe");
	});

	it("accepts a placeholder whose copied property is renamed to the path parameter", () => {
		expect(ApiControllerParametersBuildCustomRule({ controller: CustomRuleController, dto: CustomRuleRenamedCopyParametersDto, methodName: "renamedNamed", pathParameters: ["id"], resourcePath: "custom-rule/{id}" })).toBeDefined();
	});

	it.each([
		["an object result", CustomRuleObjectResultParametersDto, "id"],
		["a list result", CustomRuleListParametersDto, "id"],
		["a nested object", CustomRuleNestedParametersDto, "id"],
	])("fails at startup on %s, which has no text form", (_name: string, dto: new () => unknown, property: string) => {
		expect(() => ApiControllerParametersBuildCustomRule({ controller: CustomRuleController, dto, methodName: "noText", pathParameters: ["id"], resourcePath: "custom-rule/item" })).toThrow(`Controller "CustomRuleController" method "noText" property "${property}"`);
	});

	it("fails at startup when the DTO drops a path parameter, which IAM could not read", () => {
		expect(() => ApiControllerParametersBuildCustomRule({ controller: CustomRuleController, dto: CustomRuleExcludedParametersDto, methodName: "dropped", pathParameters: ["id"], resourcePath: "custom-rule/item" })).toThrow('Controller "CustomRuleController" method "dropped" reads the path parameter "id"');
	});

	it("does not fail at startup when a Transform rejects the startup sample", () => {
		expect(ApiControllerParametersBuildCustomRule({ controller: CustomRuleController, dto: CustomRuleThrowingParametersDto, methodName: "throwing", pathParameters: ["id"], resourcePath: "custom-rule/item" })).toBeDefined();
	});

	it("fails at startup on a response property in a PARAMETERS DTO, even with no path parameter", () => {
		expect(() => ApiControllerParametersBuildCustomRule({ controller: CustomRuleController, dto: CustomRuleResponseParametersDto, methodName: "response", pathParameters: ["id"], resourcePath: "custom-rule/item" })).toThrow('Controller "CustomRuleController" method "response" property "id"');
		expect(() => ApiControllerParametersBuildCustomRule({ controller: CustomRuleController, dto: CustomRuleResponseParametersDto, methodName: "response", pathParameters: [], resourcePath: "custom-rule/item" })).toThrow("isResponse");
	});
});
