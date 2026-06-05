import { ApiPropertyObject } from "@decorator/api/property/object.decorator";

import { ChildDto } from "./child.dto";
import { ObjectEntity } from "./entity";

export class ParentDto {
	@ApiPropertyObject({
		description: "payload",
		entity: ObjectEntity,
		isRequired: true,
		shouldValidateNested: true,
		type: ChildDto,
	})
	public payload!: ChildDto;
}
