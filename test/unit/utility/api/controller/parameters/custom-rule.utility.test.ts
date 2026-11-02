import type { IApiControllerParametersRule } from "@interface/class/api/controller/parameters-rule.interface";

import "reflect-metadata";

import { ApiPropertyCopy } from "@decorator/api/property/copy.decorator";
import { ApiPropertyDescribe } from "@decorator/api/property/describe.decorator";
import { ApiPropertyNumber } from "@decorator/api/property/number.decorator";
import { ApiPropertyUUID } from "@decorator/api/property/uuid.decorator";
import { EApiDtoType, EApiPropertyDescribeType, EApiPropertyNumberType, EApiPropertyStringType, EApiRouteType } from "@enum/decorator/api";
import { ApiControllerParametersBuildCustomRule } from "@utility/api/controller/parameters/custom-rule.utility";
import { ApiControllerParametersValidate } from "@utility/api/controller/parameters/validate.utility";
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

class CustomRuleController {}

class CustomRuleOtherController {}

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

	it("builds no rule when no path parameter is described or named", () => {
		expect(ApiControllerParametersBuildCustomRule({ controller: CustomRuleController, dto: CustomRuleUndescribedParametersDto, methodName: "undescribed", pathParameters: ["id"], resourcePath: "custom-rule/item" })).toBeUndefined();
		expect(ApiControllerParametersBuildCustomRule({ controller: CustomRuleController, dto: undefined, methodName: "noDto", pathParameters: [], resourcePath: "custom-rule/{id}" })).toBeUndefined();
	});

	it("rejects a resource path placeholder that names an undescribed path parameter", () => {
		expect(() => ApiControllerParametersBuildCustomRule({ controller: CustomRuleController, dto: CustomRuleUndescribedParametersDto, methodName: "named", pathParameters: ["id"], resourcePath: "custom-rule/{id}" })).toThrow('Controller "CustomRuleController" method "named" names the path parameter "id"');
	});

	it("builds the rule once for each controller class and method", () => {
		const first: IApiControllerParametersRule | undefined = ApiControllerParametersBuildCustomRule({ controller: CustomRuleController, dto: CustomRuleParametersDto, methodName: "cached", pathParameters: ["id"], resourcePath: "custom-rule/{id}" });
		const second: IApiControllerParametersRule | undefined = ApiControllerParametersBuildCustomRule({ controller: CustomRuleController, dto: CustomRuleParametersDto, methodName: "cached", pathParameters: ["id"], resourcePath: "custom-rule/{id}" });
		const other: IApiControllerParametersRule | undefined = ApiControllerParametersBuildCustomRule({ controller: CustomRuleOtherController, dto: CustomRuleParametersDto, methodName: "cached", pathParameters: ["id"], resourcePath: "custom-rule/{id}" });

		expect(second).toBe(first);
		expect(other).not.toBe(first);
	});
});
