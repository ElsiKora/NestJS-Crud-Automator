import { ApiPropertyNumber } from "@decorator/api/property/number.decorator";
import { ApiPropertyUUID } from "@decorator/api/property/uuid.decorator";
import { EApiPropertyNumberType } from "@enum/decorator/api";

import { CursorQueryEntity } from "./cursor.entity";

export class CursorCustomItemDto {
	@ApiPropertyUUID({
		description: "id",
		entity: CursorQueryEntity,
		isRequired: true,
		isResponse: true,
	})
	public id!: string;

	@ApiPropertyNumber({
		description: "rank",
		entity: CursorQueryEntity,
		exampleValue: 1,
		format: EApiPropertyNumberType.INTEGER,
		isRequired: true,
		isResponse: true,
		maximum: 100,
		minimum: 0,
		multipleOf: 1,
	})
	public rank!: number;
}
