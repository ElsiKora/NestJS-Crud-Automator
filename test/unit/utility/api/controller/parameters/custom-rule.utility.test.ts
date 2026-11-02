import type { IApiControllerParametersRule } from "@interface/class/api/controller";

import "reflect-metadata";

import { ApiPropertyCopy } from "@decorator/api/property/copy.decorator";
import { ApiPropertyDescribe } from "@decorator/api/property/describe.decorator";
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

class CustomRuleUndescribedParametersDto {
	public id!: number;
}

class CustomRuleController {}

class CustomRuleOtherController {}

describe("ApiControllerParametersBuildCustomRule", () => {
	it("checks a described path value that the resource path does not name, so a policy condition on it sees canonical text", async () => {
		const rule: IApiControllerParametersRule | undefined = ApiControllerParametersBuildCustomRule({ controllerName: CustomRuleController.name, dto: CustomRuleParametersDto, methodName: "conditionOnly", pathParameters: ["id"], resourcePath: "custom-rule/item" });

		expect(rule).toBeDefined();
		await expect(ApiControllerParametersValidate(rule!, { id: "16" } as never)).resolves.toEqual({ id: 16 });
		await expect(ApiControllerParametersValidate(rule!, { id: "016" } as never)).rejects.toThrow();
	});

	it("builds no rule when no path parameter is described or named", () => {
		expect(ApiControllerParametersBuildCustomRule({ controllerName: CustomRuleController.name, dto: CustomRuleUndescribedParametersDto, methodName: "undescribed", pathParameters: ["id"], resourcePath: "custom-rule/item" })).toBeUndefined();
		expect(ApiControllerParametersBuildCustomRule({ controllerName: CustomRuleController.name, dto: undefined, methodName: "noDto", pathParameters: [], resourcePath: "custom-rule/{id}" })).toBeUndefined();
	});

	it("rejects a resource path placeholder that names an undescribed path parameter", () => {
		expect(() => ApiControllerParametersBuildCustomRule({ controllerName: CustomRuleController.name, dto: CustomRuleUndescribedParametersDto, methodName: "named", pathParameters: ["id"], resourcePath: "custom-rule/{id}" })).toThrow('Controller "CustomRuleController" method "named" names the path parameter "id"');
	});

	it("builds the rule once for each controller class and method", () => {
		const first: IApiControllerParametersRule | undefined = ApiControllerParametersBuildCustomRule({ controllerName: CustomRuleController.name, dto: CustomRuleParametersDto, methodName: "cached", pathParameters: ["id"], resourcePath: "custom-rule/{id}" });
		const second: IApiControllerParametersRule | undefined = ApiControllerParametersBuildCustomRule({ controllerName: CustomRuleController.name, dto: CustomRuleParametersDto, methodName: "cached", pathParameters: ["id"], resourcePath: "custom-rule/{id}" });
		const other: IApiControllerParametersRule | undefined = ApiControllerParametersBuildCustomRule({ controllerName: CustomRuleOtherController.name, dto: CustomRuleParametersDto, methodName: "cached", pathParameters: ["id"], resourcePath: "custom-rule/{id}" });

		expect(second).toBe(first);
		expect(other).not.toBe(first);
	});
});
