import { Body, ClassSerializerInterceptor, Controller, Get, HttpCode, HttpStatus, Post, SerializeOptions, UseInterceptors } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { IsObject, ValidateNested } from "class-validator";

import { ApiPropertyObject, ApiPropertyString, EApiPropertyStringType } from "../../../src/index";

class E2eFreeFormOwnerEntity {}

export class E2eFreeFormItemDto {
	@ApiPropertyString({
		description: "name",
		entity: E2eFreeFormOwnerEntity,
		exampleValue: "Name",
		format: EApiPropertyStringType.STRING,
		isRequired: true,
		maxLength: 64,
		minLength: 1,
		pattern: "/^.+$/",
	})
	public name!: string;

	@ApiPropertyObject({
		description: "meta",
		entity: E2eFreeFormOwnerEntity,
		isRequired: true,
		type: Object,
	})
	public meta!: Record<string, unknown>;
}

export class E2eFreeFormBodyDto {
	@ApiPropertyObject({
		description: "payloads",
		entity: E2eFreeFormOwnerEntity,
		isArray: true,
		isRequired: false,
		isUniqueItems: true,
		maxItems: 5,
		minItems: 0,
		type: Object,
	})
	public payloads?: Array<Record<string, unknown>>;

	@ApiPropertyObject({
		description: "repeats",
		entity: E2eFreeFormOwnerEntity,
		isArray: true,
		isRequired: false,
		isUniqueItems: false,
		maxItems: 5,
		minItems: 1,
		type: Object,
	})
	public repeats?: Array<Record<string, unknown>>;

	@ApiPropertyObject({
		description: "single",
		entity: E2eFreeFormOwnerEntity,
		isRequired: false,
		type: Object,
	})
	public single?: Record<string, unknown>;

	@ApiPropertyObject({
		description: "undeclared",
		entity: E2eFreeFormOwnerEntity,
		isRequired: false,
		type: undefined,
	})
	public undeclared?: Record<string, unknown>;

	@ApiPropertyObject({
		description: "undeclaredList",
		entity: E2eFreeFormOwnerEntity,
		isArray: true,
		isRequired: false,
		isUniqueItems: true,
		maxItems: 5,
		minItems: 0,
		type: undefined,
	})
	public undeclaredList?: Array<Record<string, unknown>>;

	@ApiPropertyObject({
		description: "items",
		entity: E2eFreeFormOwnerEntity,
		isArray: true,
		isRequired: false,
		isUniqueItems: false,
		maxItems: 5,
		minItems: 0,
		shouldValidateNested: true,
		type: E2eFreeFormItemDto,
	})
	public items?: Array<E2eFreeFormItemDto>;
}

export class E2eFreeFormRawValidateNestedDto {
	@IsObject()
	@ValidateNested()
	public raw!: Record<string, unknown>;
}

export class E2eFreeFormResponseDto {
	@ApiPropertyObject({ description: "single", entity: E2eFreeFormOwnerEntity, isRequired: true, isResponse: true, type: Object })
	public single!: Record<string, unknown>;

	@ApiPropertyObject({ description: "undeclared", entity: E2eFreeFormOwnerEntity, isRequired: true, isResponse: true, type: undefined })
	public undeclared!: Record<string, unknown>;
}

export const E2E_FREE_FORM_RESPONSE_VALUE: Record<string, unknown> = { deep: { junk: true, toString: "kept" }, id: 1, valueOf: 2 };

const createResponse = (): E2eFreeFormResponseDto => plainToInstance(E2eFreeFormResponseDto, { hidden: true, single: E2E_FREE_FORM_RESPONSE_VALUE, undeclared: E2E_FREE_FORM_RESPONSE_VALUE }, { excludeExtraneousValues: true });

@Controller("free-form-object")
export class E2eFreeFormEchoController {
	@HttpCode(HttpStatus.OK)
	@Post("echo")
	public echo(@Body() body: E2eFreeFormBodyDto): unknown {
		return body;
	}

	@HttpCode(HttpStatus.OK)
	@Post("raw")
	public raw(@Body() body: E2eFreeFormRawValidateNestedDto): unknown {
		return body;
	}

	@Get("response")
	public response(): unknown {
		return createResponse();
	}

	@Get("response/serialized")
	@UseInterceptors(ClassSerializerInterceptor)
	public serialized(): unknown {
		return createResponse();
	}

	@Get("response/exclude-all")
	@SerializeOptions({ strategy: "excludeAll" })
	@UseInterceptors(ClassSerializerInterceptor)
	public excludeAll(): unknown {
		return createResponse();
	}
}
