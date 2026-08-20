import { ApiPropertyObject } from "@decorator/api/property/object.decorator";
import { ApiPropertyString } from "@decorator/api/property/string.decorator";
import { API_CONTROLLER_CURSOR_TOKEN_MAX_LENGTH } from "@constant/api-controller-cursor.constant";
import { EApiPropertyStringType } from "@enum/decorator/api";

import { GeneratedCursorItemDto } from "./generated-cursor-item.dto";

export class GeneratedCursorResponseDto {
	@ApiPropertyObject({
		entity: { name: "GeneratedReadContractEntity" },
		isArray: true,
		isRequired: true,
		isResponse: true,
		isUniqueItems: true,
		maxItems: 100,
		minItems: 0,
		type: GeneratedCursorItemDto,
	})
	public items!: Array<GeneratedCursorItemDto>;

	@ApiPropertyString({
		entity: { name: "GeneratedReadContractEntity" },
		exampleValue: "eyJ2IjoxLCJjIjoiLi4uIiwidmFsdWVzIjpbIi4uLiJdfQ",
		format: EApiPropertyStringType.STRING,
		isNullable: true,
		isRequired: true,
		isResponse: true,
		maxLength: API_CONTROLLER_CURSOR_TOKEN_MAX_LENGTH,
		minLength: 1,
		pattern: "/^[A-Za-z0-9_-]+$/",
	})
	public nextCursor!: null | string;

	@ApiPropertyString({
		entity: { name: "GeneratedReadContractEntity" },
		exampleValue: "eyJ2IjoxLCJjIjoiLi4uIiwidmFsdWVzIjpbIi4uLiJdfQ",
		format: EApiPropertyStringType.STRING,
		isNullable: true,
		isRequired: true,
		isResponse: true,
		maxLength: API_CONTROLLER_CURSOR_TOKEN_MAX_LENGTH,
		minLength: 1,
		pattern: "/^[A-Za-z0-9_-]+$/",
	})
	public previousCursor!: null | string;
}
