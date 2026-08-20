import { ApiPropertyNumber } from "@decorator/api/property/number.decorator";
import { ApiPropertyUUID } from "@decorator/api/property/uuid.decorator";
import { EApiPropertyNumberType } from "@enum/decorator/api";

import { CursorQueryEntity } from "./cursor.entity";

export class CursorCustomAccessorItemDto {
	@ApiPropertyUUID({
		entity: CursorQueryEntity,
		isRequired: true,
		isResponse: true,
	})
	public id!: string;

	@ApiPropertyNumber({
		entity: CursorQueryEntity,
		exampleValue: 1,
		format: EApiPropertyNumberType.INTEGER,
		isRequired: true,
		isResponse: true,
		maximum: 100,
		minimum: 0,
		multipleOf: 1,
	})
	public get rank(): number {
		return 1;
	}
}
