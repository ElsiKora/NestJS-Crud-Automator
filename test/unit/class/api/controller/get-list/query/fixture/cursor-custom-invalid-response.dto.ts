import { ApiPropertyObject } from "@decorator/api/property/object.decorator";
import { ApiPropertyString } from "@decorator/api/property/string.decorator";
import { EApiPropertyStringType } from "@enum/decorator/api";

import { CursorCustomItemDto } from "./cursor-custom-item.dto";
import { CursorQueryEntity } from "./cursor.entity";

export class CursorCustomInvalidResponseDto {
	@ApiPropertyObject({
		entity: CursorQueryEntity,
		isArray: true,
		isRequired: true,
		isResponse: true,
		isUniqueItems: true,
		maxItems: 100,
		minItems: 0,
		type: CursorCustomItemDto,
	})
	public items!: Array<CursorCustomItemDto>;

	@ApiPropertyString({
		entity: CursorQueryEntity,
		exampleValue: "cursor",
		format: EApiPropertyStringType.STRING,
		isNullable: true,
		isRequired: true,
		isResponse: true,
		maxLength: 10,
		minLength: 1,
		pattern: "/^[A-Za-z0-9_-]+$/",
	})
	public nextCursor!: null | string;

	@ApiPropertyString({
		entity: CursorQueryEntity,
		exampleValue: "cursor",
		format: EApiPropertyStringType.STRING,
		isNullable: true,
		isRequired: true,
		isResponse: true,
		maxLength: 10,
		minLength: 1,
		pattern: "/^[A-Za-z0-9_-]+$/",
	})
	public previousCursor!: null | string;
}
