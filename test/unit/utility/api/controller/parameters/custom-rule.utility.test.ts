import type { IApiControllerParametersRule } from "@interface/class/api/controller/parameters-rule.interface";

import "reflect-metadata";

import { ApiRequestValidationException } from "@class/api/request-validation-exception.class";
import { ApiPropertyCopy } from "@decorator/api/property/copy.decorator";
import { ApiPropertyDescribe } from "@decorator/api/property/describe.decorator";
import { ApiPropertyNumber } from "@decorator/api/property/number.decorator";
import { ApiPropertyString } from "@decorator/api/property/string.decorator";
import { ApiPropertyUUID } from "@decorator/api/property/uuid.decorator";
import { EApiDtoType, EApiPropertyDescribeType, EApiPropertyNumberType, EApiPropertyStringType, EApiRouteType } from "@enum/decorator/api";
import { ApiControllerParametersBuildCustomRule } from "@utility/api/controller/parameters/custom-rule.utility";
import { ApiControllerParametersValidate } from "@utility/api/controller/parameters/validate.utility";
import { ApiPropertyBoolean } from "@decorator/api/property/boolean.decorator";
import { Exclude, Expose, Transform, TransformationType, Type } from "class-transformer";
import { IsBoolean, IsDate, IsDefined, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, ValidateNested } from "class-validator";
import { Column, Entity, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";
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

	@Column({ type: "uuid" })
	@ApiPropertyDescribe({ description: "code", type: EApiPropertyDescribeType.UUID })
	public code!: string;

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

class CustomRuleBooleanParametersDto {
	@ApiPropertyBoolean({ description: "flag", entity: CustomRuleItemEntity, isRequired: true } as never)
	public id!: boolean;
}

class CustomRuleBareUuidParametersDto {
	@IsUUID()
	public id!: string;
}

class CustomRuleStringUuidParametersDto {
	@ApiPropertyString({ description: "id", entity: CustomRuleItemEntity, exampleValue: "550e8400-e29b-41d4-a716-446655440000", format: EApiPropertyStringType.UUID, isRequired: true, maxLength: 36, minLength: 36, pattern: "/^.+$/" })
	public id!: string;
}

class CustomRuleCopiedUuidParametersDto {
	@ApiPropertyCopy({ dtoType: EApiDtoType.PARAMETERS, entity: () => CustomRuleItemEntity, method: EApiRouteType.GET, propertyName: "code" })
	public id!: string;
}

class CustomRuleAutoCopyParametersDto {
	@ApiPropertyCopy({ entity: () => CustomRuleItemEntity, propertyName: "code", shouldAutoResolveContext: true })
	public id!: string;
}

class CustomRulePrefixParametersDto {
	@IsString()
	@Transform(({ value }: { value: unknown }): string => `p-${String(value)}`, { toClassOnly: true })
	public id!: string;
}

class CustomRuleBase64ParametersDto {
	@IsString()
	@Transform(({ value }: { value: unknown }): string => Buffer.from(String(value), "base64url").toString(), { toClassOnly: true })
	public id!: string;
}

class CustomRulePlusOneParametersDto {
	@IsNotEmpty()
	@Transform(({ value }: { value: unknown }): unknown => (value as number) + 1)
	public id!: number;
}

class CustomRuleTypeSensitiveParametersDto {
	@IsNotEmpty()
	@Transform(({ value }: { value: unknown }): unknown => (typeof value === "number" ? value : `p-${String(value)}`))
	public id!: number;
}

class CustomRuleBooleanEqualsParametersDto {
	@IsBoolean()
	@Transform(({ value }: { value: unknown }): boolean => value === "true")
	public id!: boolean;
}

class CustomRuleBareBooleanParametersDto {
	@IsBoolean()
	public id!: boolean;
}

class CustomRuleTypeBooleanParametersDto {
	@IsBoolean()
	@Type(() => Boolean)
	public id!: boolean;
}

class CustomRuleGroupTransformParametersDto {
	@IsString()
	@Transform(({ value }: { value: unknown }): string => String(value).toLowerCase(), { groups: ["g"] })
	public id!: string;
}

class CustomRuleVersionTransformParametersDto {
	@IsString()
	@Transform(({ value }: { value: unknown }): string => String(value).toLowerCase(), { since: 2 })
	public id!: string;
}

class CustomRuleSteadyGroupTransformParametersDto {
	@IsString()
	@Transform(({ value }: { value: unknown }): string => String(value).trim(), { groups: ["g"] })
	public id!: string;
}

class CustomRuleSteadyRenamedGroupTransformParametersDto {
	@Expose({ name: "id" })
	@IsString()
	@Transform(({ value }: { value: unknown }): string => String(value).trim(), { groups: ["g"] })
	public inner!: string;
}

class CustomRuleSteadyClassOnlyGroupTransformParametersDto {
	@IsString()
	@Transform(({ value }: { value: unknown }): unknown => (value === "7" ? "8" : value), { groups: ["g"], toClassOnly: true })
	public id!: string;
}

class CustomRuleUntilTransformParametersDto {
	@IsString()
	@Transform(({ value }: { value: unknown }): string => String(value).toLowerCase(), { until: 2 })
	public id!: string;
}

class CustomRuleVersionExposeParametersDto {
	@Expose({ since: 2 })
	@IsString()
	public id!: string;
}

class CustomRuleGroupValidatorParametersDto {
	@IsInt({ groups: ["admin"] })
	@Type(() => Number)
	public id!: number;
}

class CustomRuleGroupValidatorsParametersDto {
	@IsInt({ groups: ["admin"] })
	@IsString({ groups: ["user"] })
	public id!: string;
}

class CustomRuleToPlainGroupTransformParametersDto {
	@IsString()
	@Transform(({ value }: { value: unknown }): string => String(value).toUpperCase(), { groups: ["g"], toPlainOnly: true })
	public id!: string;
}

class CustomRuleOtherPropertyGroupTransformParametersDto {
	@IsString()
	public id!: string;

	@IsOptional()
	@Transform(({ value }: { value: unknown }): string => String(value).toUpperCase(), { groups: ["g"] })
	public other?: string;
}

class CustomRuleRenamedTrimParametersDto {
	@Expose({ name: "id" })
	@IsString()
	@Transform(({ value }: { value: unknown }): string => String(value).trim())
	public inner!: string;
}

class CustomRuleRenamedDefaultSiblingParametersDto {
	@Expose({ name: "id" })
	@IsString()
	public inner!: string;

	@Expose()
	@Transform(({ value }: { value: unknown }): unknown => value ?? "default")
	public label?: string;
}

class CustomRuleRenamedConstantBesideDefaultParametersDto {
	@Expose({ name: "id" })
	@IsString()
	@Transform((): string => "constant", { toPlainOnly: true })
	public inner!: string;

	@Expose()
	@IsOptional()
	@Transform(({ value }: { value: unknown }): unknown => value ?? "default")
	public label?: string;
}

class CustomRuleRenamedPlainDateParametersDto {
	@Expose({ name: "id" })
	@IsDate()
	@Transform(({ value }: { value: Date }): string => value.toISOString(), { toPlainOnly: true })
	@Type(() => Date)
	public inner!: Date;
}

class CustomRuleBooleanTransformParametersDto {
	@IsBoolean()
	@Transform(({ value }: { value: unknown }): unknown => {
		if (value === "true") {
			return true;
		}

		return value === "false" ? false : value;
	})
	public id!: boolean;
}

class CustomRuleForeignEntityNameParametersDto {
	@ApiPropertyUUID({ entity: { name: "ConfigData" }, isRequired: true })
	public id!: string;
}

@Entity("custom_rule_keys")
class CustomRuleKeyEntity {
	@PrimaryColumn({ precision: 10, scale: 2, type: "decimal" })
	@ApiPropertyDescribe({ description: "amount", exampleValue: 1.5, format: EApiPropertyNumberType.DOUBLE, maximum: 1000, minimum: 0, multipleOf: 0.01, type: EApiPropertyDescribeType.NUMBER })
	public amount!: number;

	@Column({ type: "float" })
	@ApiPropertyDescribe({ description: "rate", exampleValue: 1.5, format: EApiPropertyNumberType.DOUBLE, maximum: 1000, minimum: 0, multipleOf: 0.01, type: EApiPropertyDescribeType.NUMBER })
	public rate!: number;

	@Column({ type: "int" })
	@ApiPropertyDescribe({ description: "ref", exampleValue: "16", format: EApiPropertyStringType.STRING, maxLength: 20, minLength: 1, pattern: String.raw`/^-?\d+$/`, type: EApiPropertyDescribeType.STRING })
	public ref!: string;
}

class CustomRuleDecimalCopyParametersDto {
	@ApiPropertyCopy({ dtoType: EApiDtoType.PARAMETERS, entity: (): typeof CustomRuleKeyEntity => CustomRuleKeyEntity, method: EApiRouteType.GET, propertyName: "amount" })
	public id!: number;
}

class CustomRuleFloatCopyParametersDto {
	@ApiPropertyCopy({ dtoType: EApiDtoType.PARAMETERS, entity: (): typeof CustomRuleKeyEntity => CustomRuleKeyEntity, method: EApiRouteType.GET, propertyName: "rate" })
	public id!: number;
}

class CustomRuleIntegerTextCopyParametersDto {
	@ApiPropertyCopy({ dtoType: EApiDtoType.PARAMETERS, entity: (): typeof CustomRuleKeyEntity => CustomRuleKeyEntity, method: EApiRouteType.GET, propertyName: "ref" })
	public id!: string;
}

class CustomRuleShadowedByNameParametersDto {
	@Expose({ name: "id" })
	@IsInt()
	@Type(() => Number)
	public internalId!: number;

	@IsOptional()
	@IsString()
	public id?: string;
}

class CustomRuleShadowedWithInitializerParametersDto {
	@Expose({ name: "id" })
	@IsInt()
	@Type(() => Number)
	public internalId!: number;

	@IsOptional()
	@IsString()
	public id: string = "safe";
}

class CustomRuleTwoExposesParametersDto {
	@Expose({ name: "id" })
	@IsInt()
	@Type(() => Number)
	public first!: number;

	@Expose({ name: "id" })
	@IsOptional()
	@IsInt()
	public second?: number;
}

class CustomRuleToClassExcludedParametersDto {
	@Exclude({ toClassOnly: true })
	@IsOptional()
	public id!: string;
}

class CustomRuleToPlainExcludedParametersDto {
	@Exclude({ toPlainOnly: true })
	@IsInt()
	@Type(() => Number)
	public id!: number;
}

class CustomRuleExposedElsewhereParametersDto {
	@Expose({ name: "other" })
	@IsString()
	public id!: string;
}

class CustomRuleExposedWithGroupsParametersDto {
	@Expose({ groups: ["g"], name: "id" })
	@IsInt()
	@Type(() => Number)
	public internalId!: number;
}

class CustomRuleWriteBackThrowsRenamedParametersDto {
	@Expose({ name: "id" })
	@IsInt()
	@Transform(({ type, value }: { type: TransformationType; value: unknown }): unknown => {
		if (type === TransformationType.CLASS_TO_PLAIN) {
			throw new Error("Not written back");
		}

		return value;
	})
	@Type(() => Number)
	public internalId!: number;
}

class CustomRuleWriteBackThrowsParametersDto {
	@IsInt()
	@Transform(({ type, value }: { type: TransformationType; value: unknown }): unknown => {
		if (type === TransformationType.CLASS_TO_PLAIN) {
			throw new Error("Not written back");
		}

		return value;
	})
	@Type(() => Number)
	public id!: number;
}

class CustomRuleStringOnlyRenamedParametersDto {
	@Expose({ name: "id" })
	@IsInt()
	@Transform(({ value }: { value: unknown }): number => {
		if (typeof value !== "string") {
			throw new TypeError("Not a string");
		}

		return Number.parseInt(value, 10);
	})
	public internalId!: number;
}

class CustomRuleDefaultSiblingParametersDto {
	@Expose({ name: "id" })
	@IsInt()
	@Type(() => Number)
	public internalId!: number;

	@Expose()
	@Transform(({ value }: { value: unknown }): unknown => value ?? "default")
	public label?: string;
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
		await expect(ApiControllerParametersValidate(rule!, { id: "16", owner } as never)).resolves.toEqual({ id: 16, owner });
		await expect(ApiControllerParametersValidate(rule!, { id: "16", owner: owner.toUpperCase() } as never)).rejects.toMatchObject({ response: { message: ["owner must be a lower-case UUID"] } });

		for (const id of ["016", "1e1", "abc"]) {
			await expect(ApiControllerParametersValidate(rule!, { id, owner } as never)).rejects.toThrow();
		}
	});

	it("builds no rule for a route with no path parameter, so it costs nothing per request", () => {
		expect(ApiControllerParametersBuildCustomRule({ controller: CustomRuleController, dto: CustomRuleParametersDto, methodName: "noParameter", pathParameters: [], resourcePath: "custom-rule/item" })).toBeUndefined();
		expect(ApiControllerParametersBuildCustomRule({ controller: CustomRuleController, dto: undefined, methodName: "noDtoNamed", pathParameters: [], resourcePath: "custom-rule/{id}" })).toBeUndefined();
	});

	it.each([
		["an IAM", "custom-rule/item"],
		["a HOOKS", undefined],
	])("fails at startup on %s route with a path parameter and no PARAMETERS DTO, whose value a policy would read as sent", (_mode: string, resourcePath: string | undefined) => {
		expect(() => ApiControllerParametersBuildCustomRule({ controller: CustomRuleController, dto: undefined, methodName: "noDto", pathParameters: ["id"], resourcePath })).toThrow('Controller "CustomRuleController" method "noDto" has the path parameter "id" but declares no PARAMETERS DTO');
	});

	it.each([
		["an IAM", "custom-rule/item"],
		["a HOOKS", undefined],
		["an IAM resourcePath placeholder on", "custom-rule/{id}"],
	])("fails at startup on %s path parameter the DTO does not describe, whose value a policy would read as sent", (_case: string, resourcePath: string | undefined) => {
		expect(() => ApiControllerParametersBuildCustomRule({ controller: CustomRuleController, dto: CustomRuleUndescribedParametersDto, methodName: "undescribed", pathParameters: ["id"], resourcePath })).toThrow('Controller "CustomRuleController" method "undescribed" has the path parameter "id", which its PARAMETERS DTO "CustomRuleUndescribedParametersDto" does not describe');
	});

	it("builds the rule of a HOOKS route, which has no resource path", async () => {
		const rule: IApiControllerParametersRule | undefined = ApiControllerParametersBuildCustomRule({ controller: CustomRuleController, dto: CustomRuleParametersDto, methodName: "hooks", pathParameters: ["id"], resourcePath: undefined });

		await expect(ApiControllerParametersValidate(rule!, { id: "016" } as never)).rejects.toThrow();
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

	it.each([
		["a Transform that adds a prefix on every call", CustomRulePrefixParametersDto, "changes its own output"],
		["a Transform that decodes", CustomRuleBase64ParametersDto, "changes its own output"],
		["a Transform that adds one", CustomRulePlusOneParametersDto, "with and without implicit conversion"],
		["a Transform that depends on the type it gets", CustomRuleTypeSensitiveParametersDto, "with and without implicit conversion"],
		["a boolean Transform that sees the converted value", CustomRuleBooleanEqualsParametersDto, "with and without implicit conversion"],
		["a bare boolean rule, under which implicit conversion makes false true", CustomRuleBareBooleanParametersDto, "into the other boolean value"],
		["a boolean Type, which makes false true", CustomRuleTypeBooleanParametersDto, "into the other boolean value"],
		["a Transform limited to groups", CustomRuleGroupTransformParametersDto, "limited to class-transformer groups"],
	])("fails at startup on %s, naming the route, the DTO and what to change", (_name: string, dto: new () => unknown, reason: string) => {
		expect(() => ApiControllerParametersBuildCustomRule({ controller: CustomRuleController, dto, methodName: "refused", pathParameters: ["id"], resourcePath: "custom-rule/item" })).toThrow(`Controller "CustomRuleController" method "refused" property "id" of PARAMETERS DTO "${dto.name}"`);
		expect(() => ApiControllerParametersBuildCustomRule({ controller: CustomRuleController, dto, methodName: "refused", pathParameters: ["id"], resourcePath: "custom-rule/item" })).toThrow(reason);
	});

	it.each([
		["a property with the name of the path parameter", CustomRuleShadowedByNameParametersDto],
		["a property with an initializer and the name of the path parameter", CustomRuleShadowedWithInitializerParametersDto],
		["two properties exposed under that name", CustomRuleTwoExposesParametersDto],
	])("fails at startup when %s shadows a renamed path value", (_name: string, dto: new () => unknown) => {
		expect(() => ApiControllerParametersBuildCustomRule({ controller: CustomRuleController, dto, methodName: "shadowed", pathParameters: ["id"], resourcePath: "custom-rule/item" })).toThrow("both expose that name");
	});

	it.each([
		["an Exclude on the conversion to the class", CustomRuleToClassExcludedParametersDto, "id"],
		["a path parameter named constructor, which class-transformer skips", CustomRuleUndescribedParametersDto, "constructor"],
		["a path parameter named __proto__, which class-transformer skips", CustomRuleUndescribedParametersDto, "__proto__"],
	])("fails at startup on %s, whatever a class field leaves on the instance", (_name: string, dto: new () => unknown, parameter: string) => {
		expect(() => ApiControllerParametersBuildCustomRule({ controller: CustomRuleController, dto, methodName: "dropped", pathParameters: [parameter], resourcePath: "custom-rule/item" })).toThrow(`which drops it`);
	});

	it("says a property is exposed under another name instead of saying the DTO drops it", () => {
		expect(() => ApiControllerParametersBuildCustomRule({ controller: CustomRuleController, dto: CustomRuleExposedElsewhereParametersDto, methodName: "elsewhere", pathParameters: ["id"], resourcePath: "custom-rule/item" })).toThrow('expose it as "id"');
	});

	it("says a renamed property's Transform throws on write back instead of saying the DTO drops it", () => {
		expect(() => ApiControllerParametersBuildCustomRule({ controller: CustomRuleController, dto: CustomRuleWriteBackThrowsRenamedParametersDto, methodName: "throwsBack", pathParameters: ["id"], resourcePath: "custom-rule/item" })).toThrow("add { toClassOnly: true }");
	});

	it("runs a DTO the old detection refused or misread", async () => {
		const build = (dto: new () => unknown): IApiControllerParametersRule => {
			const rule: IApiControllerParametersRule | undefined = ApiControllerParametersBuildCustomRule({ controller: CustomRuleController, dto, methodName: "worksNow", pathParameters: ["id"], resourcePath: "custom-rule/item" });

			if (!rule) {
				throw new Error("The route has no rule");
			}

			return rule;
		};

		await expect(ApiControllerParametersValidate(build(CustomRuleExposedWithGroupsParametersDto), { id: "16" } as never)).resolves.toEqual({ id: 16 });
		await expect(ApiControllerParametersValidate(build(CustomRuleStringOnlyRenamedParametersDto), { id: "16" } as never)).resolves.toEqual({ id: 16 });
		await expect(ApiControllerParametersValidate(build(CustomRuleWriteBackThrowsParametersDto), { id: "16" } as never)).resolves.toEqual({ id: 16 });
		await expect(ApiControllerParametersValidate(build(CustomRuleToPlainExcludedParametersDto), { id: "16" } as never)).resolves.toEqual({ id: 16 });
		await expect(ApiControllerParametersValidate(build(CustomRuleDefaultSiblingParametersDto), { id: "16" } as never)).resolves.toEqual({ id: 16 });
	});

	it("keeps a boolean described by ApiPropertyBoolean, whose two texts keep their values", async () => {
		const rule: IApiControllerParametersRule | undefined = ApiControllerParametersBuildCustomRule({ controller: CustomRuleController, dto: CustomRuleBooleanParametersDto, methodName: "boolean", pathParameters: ["id"], resourcePath: "custom-rule/item" });

		await expect(ApiControllerParametersValidate(rule!, { id: "true" } as never)).resolves.toEqual({ id: true });
		await expect(ApiControllerParametersValidate(rule!, { id: "false" } as never)).resolves.toEqual({ id: false });
	});

	it("refuses an upper-case UUID under a bare class-validator rule and under ApiPropertyUUID, without a column", async () => {
		const bare: IApiControllerParametersRule | undefined = ApiControllerParametersBuildCustomRule({ controller: CustomRuleController, dto: CustomRuleBareUuidParametersDto, methodName: "bare", pathParameters: ["id"], resourcePath: "custom-rule/item" });
		const described: IApiControllerParametersRule | undefined = ApiControllerParametersBuildCustomRule({ controller: CustomRuleController, dto: CustomRuleDescribedParametersDto, methodName: "described", pathParameters: ["id", "owner"], resourcePath: "custom-rule/item" });
		const sent: string = "AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA";

		await expect(ApiControllerParametersValidate(bare!, { id: sent } as never)).rejects.toMatchObject({ response: { message: ["id must be a lower-case UUID"] } });
		await expect(ApiControllerParametersValidate(described!, { id: "16", owner: sent } as never)).rejects.toMatchObject({ response: { message: ["owner must be a lower-case UUID"] } });
		await expect(ApiControllerParametersValidate(bare!, { id: sent.toLowerCase() } as never)).resolves.toEqual({ id: sent.toLowerCase() });
	});

	it.each([
		["ApiPropertyString with the UUID format", CustomRuleStringUuidParametersDto],
		["ApiPropertyCopy of a UUID column", CustomRuleCopiedUuidParametersDto],
	])("refuses an upper-case UUID under %s", async (_name: string, dto: new () => unknown) => {
		const rule: IApiControllerParametersRule | undefined = ApiControllerParametersBuildCustomRule({ controller: CustomRuleController, dto, methodName: "uuid", pathParameters: ["id"], resourcePath: "custom-rule/item" });
		const sent: string = "AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA";

		await expect(ApiControllerParametersValidate(rule!, { id: sent } as never)).rejects.toMatchObject({ response: { message: ["id must be a lower-case UUID"] } });
		await expect(ApiControllerParametersValidate(rule!, { id: sent.toLowerCase() } as never)).resolves.toEqual({ id: sent.toLowerCase() });
	});

	it("fails at startup on a copy with shouldAutoResolveContext that no route context reached, whose rule it cannot know", () => {
		expect(() => ApiControllerParametersBuildCustomRule({ controller: CustomRuleController, dto: CustomRuleAutoCopyParametersDto, methodName: "auto", pathParameters: ["id"], resourcePath: "custom-rule/item" })).toThrow('reads its path parameters with the PARAMETERS DTO "CustomRuleAutoCopyParametersDto", whose property "id" copies an entity column with shouldAutoResolveContext and has no route context');
	});

	it.each([
		["a group", CustomRuleSteadyGroupTransformParametersDto],
		["a group, on a renamed property", CustomRuleSteadyRenamedGroupTransformParametersDto],
		["a group and to the conversion from the request", CustomRuleSteadyClassOnlyGroupTransformParametersDto],
		["a since version", CustomRuleVersionTransformParametersDto],
		["an until version", CustomRuleUntilTransformParametersDto],
	])("fails at startup on a Transform limited to %s, even when it leaves every sample unchanged", (_name: string, dto: new () => unknown) => {
		expect(() => ApiControllerParametersBuildCustomRule({ controller: CustomRuleController, dto, methodName: "limited", pathParameters: ["id"], resourcePath: "custom-rule/item" })).toThrow("a @Transform of it is limited to class-transformer groups or versions");
	});

	it("fails at startup on an Expose limited to a version, which a host pipe of another version drops", () => {
		expect(() => ApiControllerParametersBuildCustomRule({ controller: CustomRuleController, dto: CustomRuleVersionExposeParametersDto, methodName: "exposedVersion", pathParameters: ["id"], resourcePath: "custom-rule/item" })).toThrow("its @Expose is limited to class-transformer versions");
	});

	it.each([
		["one validator", CustomRuleGroupValidatorParametersDto],
		["two validators", CustomRuleGroupValidatorsParametersDto],
	])("fails at startup on %s limited to groups, which would always answer 400", (_name: string, dto: new () => unknown) => {
		expect(() => ApiControllerParametersBuildCustomRule({ controller: CustomRuleController, dto, methodName: "groupValidator", pathParameters: ["id"], resourcePath: "custom-rule/item" })).toThrow("a validator of it is limited to class-validator groups: the guard runs every validator, while a host pipe with groups runs only those of its groups");
	});

	it("starts on a limited Transform that does not touch a path value", () => {
		expect(ApiControllerParametersBuildCustomRule({ controller: CustomRuleController, dto: CustomRuleToPlainGroupTransformParametersDto, methodName: "toPlainGroup", pathParameters: ["id"], resourcePath: "custom-rule/item" })).toBeDefined();
		expect(ApiControllerParametersBuildCustomRule({ controller: CustomRuleController, dto: CustomRuleOtherPropertyGroupTransformParametersDto, methodName: "otherGroup", pathParameters: ["id"], resourcePath: "custom-rule/item" })).toBeDefined();
	});

	it("reads the exposed name of a Transform that gives text for an unset value", async () => {
		const rule: IApiControllerParametersRule | undefined = ApiControllerParametersBuildCustomRule({ controller: CustomRuleController, dto: CustomRuleRenamedTrimParametersDto, methodName: "renamedTrim", pathParameters: ["id"], resourcePath: "custom-rule/item" });

		await expect(ApiControllerParametersValidate(rule!, { id: " abc " } as never)).resolves.toEqual({ id: "abc" });
	});

	it("fails at startup when a renamed property writes a constant beside a sibling that gives a default, so the name it holds stays unknown", () => {
		expect(() => ApiControllerParametersBuildCustomRule({ controller: CustomRuleController, dto: CustomRuleRenamedConstantBesideDefaultParametersDto, methodName: "renamedConstant", pathParameters: ["id"], resourcePath: "custom-rule/item" })).toThrow('reads the path parameter "id" through PARAMETERS DTO "CustomRuleRenamedConstantBesideDefaultParametersDto", where the property "inner" writes the same value under "id" and "label" whatever the sample');
	});

	it("reads the exposed name of a property next to a sibling that gives a default", async () => {
		const rule: IApiControllerParametersRule | undefined = ApiControllerParametersBuildCustomRule({ controller: CustomRuleController, dto: CustomRuleRenamedDefaultSiblingParametersDto, methodName: "renamedSibling", pathParameters: ["id"], resourcePath: "custom-rule/item" });

		await expect(ApiControllerParametersValidate(rule!, { id: "16" } as never)).resolves.toEqual({ id: "16" });
	});

	it("starts a renamed date whose written form only a date has, as the same DTO without the rename does", async () => {
		const rule: IApiControllerParametersRule | undefined = ApiControllerParametersBuildCustomRule({ controller: CustomRuleController, dto: CustomRuleRenamedPlainDateParametersDto, methodName: "renamedDate", pathParameters: ["id"], resourcePath: "custom-rule/item" });
		const values: Record<string, unknown> = (await ApiControllerParametersValidate(rule!, { id: "2024-03-10T12:00:00Z" } as never)) as Record<string, unknown>;

		expect(values.id).toEqual(new Date("2024-03-10T12:00:00.000Z"));
	});

	it("tells a DTO whose Transform reads the converted value how to reach the sent text", () => {
		expect(() => ApiControllerParametersBuildCustomRule({ controller: CustomRuleController, dto: CustomRuleBooleanTransformParametersDto, methodName: "booleanTransform", pathParameters: ["id"], resourcePath: "custom-rule/item" })).toThrow("read the sent text from obj[key]");
	});

	it("fails at startup on a described UUID that a resource path names without an entity column", () => {
		expect(() => ApiControllerParametersBuildCustomRule({ controller: CustomRuleController, dto: CustomRuleForeignEntityNameParametersDto, methodName: "foreignName", pathParameters: ["id"], resourcePath: "config-data/{id}" })).toThrow("must copy that value from an entity column");
	});

	it.each([
		["a decimal", CustomRuleDecimalCopyParametersDto],
		["a float", CustomRuleFloatCopyParametersDto],
	])("fails at startup on a copy of %s column, whose text no Deny can compare", (_name: string, dto: new () => unknown) => {
		expect(() => ApiControllerParametersBuildCustomRule({ controller: CustomRuleController, dto, methodName: "decimalCopy", pathParameters: ["id"], resourcePath: "custom-rule/item" })).toThrow(/method "decimalCopy" holds the path parameter "id" in the \w+ column "\w+"/);
	});

	it("refuses a spelling of an integer column copied as text", async () => {
		const rule: IApiControllerParametersRule | undefined = ApiControllerParametersBuildCustomRule({ controller: CustomRuleController, dto: CustomRuleIntegerTextCopyParametersDto, methodName: "integerText", pathParameters: ["id"], resourcePath: "custom-rule/{id}" });

		await expect(ApiControllerParametersValidate(rule!, { id: "16" } as never)).resolves.toEqual({ id: "16" });
		await expect(ApiControllerParametersValidate(rule!, { id: "016" } as never)).rejects.toThrow(ApiRequestValidationException);
		await expect(ApiControllerParametersValidate(rule!, { id: "-0" } as never)).rejects.toThrow(ApiRequestValidationException);
	});

	it("does not fail at startup when a Transform rejects the startup sample", () => {
		expect(ApiControllerParametersBuildCustomRule({ controller: CustomRuleController, dto: CustomRuleThrowingParametersDto, methodName: "throwing", pathParameters: ["id"], resourcePath: "custom-rule/item" })).toBeDefined();
	});

	it("fails at startup on a response property in a PARAMETERS DTO, even with no path parameter", () => {
		expect(() => ApiControllerParametersBuildCustomRule({ controller: CustomRuleController, dto: CustomRuleResponseParametersDto, methodName: "response", pathParameters: ["id"], resourcePath: "custom-rule/item" })).toThrow('Controller "CustomRuleController" method "response" property "id"');
		expect(() => ApiControllerParametersBuildCustomRule({ controller: CustomRuleController, dto: CustomRuleResponseParametersDto, methodName: "response", pathParameters: [], resourcePath: "custom-rule/item" })).toThrow("isResponse");
	});
});
