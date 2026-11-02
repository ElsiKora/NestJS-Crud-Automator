import { ApiPropertyNumber, ApiPropertyUUID, EApiPropertyNumberType } from "../../../../src/index";

import { SameNameItemEntity } from "./entity";

export class SameNameSecondCursorItemDto {
	@ApiPropertyUUID({ entity: SameNameItemEntity, isRequired: true, isResponse: true })
	public id!: string;

	@ApiPropertyNumber({ description: "second beta", entity: SameNameItemEntity, exampleValue: 3, format: EApiPropertyNumberType.INTEGER, isRequired: true, isResponse: true, maximum: 9, minimum: 1, multipleOf: 1 })
	public beta!: number;
}
