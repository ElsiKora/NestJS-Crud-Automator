import { ApiPropertyObject } from "@decorator/api/property/object.decorator";

import { ObjectEntity } from "./entity";

export class FreeformResponseDto {
	@ApiPropertyObject({
		description: "payload",
		entity: ObjectEntity,
		isRequired: true,
		isResponse: true,
		type: Object,
	})
	public payload!: Record<string, unknown>;
}
