import { ApiPropertyString, ApiPropertyUUID, EApiPropertyStringType } from "../../../../src/index";

import { SameNameItemEntity } from "./entity";

export class SameNameFirstCursorItemDto {
	@ApiPropertyUUID({ entity: SameNameItemEntity, isRequired: true, isResponse: true })
	public id!: string;

	@ApiPropertyString({ description: "first alpha", entity: SameNameItemEntity, exampleValue: "alpha", format: EApiPropertyStringType.STRING, isRequired: true, isResponse: true, maxLength: 6, minLength: 1, pattern: "/^[a-z]+$/" })
	public alpha!: string;
}
