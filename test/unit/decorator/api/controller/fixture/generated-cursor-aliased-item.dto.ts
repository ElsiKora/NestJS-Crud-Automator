import { ApiPropertyNumber } from "@decorator/api/property/number.decorator";
import { ApiPropertyUUID } from "@decorator/api/property/uuid.decorator";
import { EApiPropertyNumberType } from "@enum/decorator/api";
import { Expose } from "class-transformer";

export class GeneratedCursorAliasedItemDto {
	@Expose({ name: "cursorId" })
	@ApiPropertyUUID({
		entity: { name: "GeneratedReadContractEntity" },
		isRequired: true,
		isResponse: true,
	})
	public id!: string;

	@ApiPropertyNumber({
		entity: { name: "GeneratedReadContractEntity" },
		exampleValue: 1,
		format: EApiPropertyNumberType.INTEGER,
		isRequired: true,
		isResponse: true,
		maximum: 100,
		minimum: 0,
		multipleOf: 1,
	})
	public sequence!: number;
}
