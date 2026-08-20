import { ApiPropertyUUID } from "@decorator/api/property/uuid.decorator";

import { CursorQueryEntity } from "./cursor.entity";

export class CursorCustomIncompleteItemDto {
	@ApiPropertyUUID({
		description: "id",
		entity: CursorQueryEntity,
		isRequired: true,
		isResponse: true,
	})
	public id!: string;
}
