import { ApiPropertyNumber } from "@decorator/api/property/number.decorator";
import { ApiPropertyUUID } from "@decorator/api/property/uuid.decorator";
import { EApiPropertyNumberType } from "@enum/decorator/api";
import { Transform } from "class-transformer";

export class GeneratedCursorTransformedItemDto {
	@ApiPropertyUUID({
		entity: { name: "GeneratedReadContractEntity" },
		isRequired: true,
		isResponse: true,
	})
	public id!: string;

	@Transform((): number => 999, { toPlainOnly: true })
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
