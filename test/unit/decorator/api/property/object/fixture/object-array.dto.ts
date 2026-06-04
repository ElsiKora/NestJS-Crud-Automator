import { ApiPropertyObject } from "@decorator/api/property/object.decorator";

import { ChildDto } from "./child.dto";
import { ObjectEntity } from "./entity";

export class ObjectArrayDto {
	@ApiPropertyObject({
		description: "payloads",
		entity: ObjectEntity,
		isArray: true,
		isRequired: true,
		isUniqueItems: true,
		maxItems: 3,
		minItems: 2,
		shouldValidateNested: true,
		type: ChildDto,
	})
	public payloads!: Array<ChildDto>;
}
