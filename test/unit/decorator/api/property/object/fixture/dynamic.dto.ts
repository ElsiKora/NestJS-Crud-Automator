import { ApiPropertyObject } from "@decorator/api/property/object.decorator";

import { CatDto } from "./cat.dto";
import { ObjectEntity } from "./entity";

export class DynamicDto {
	@ApiPropertyObject({
		description: "dynamic",
		discriminator: {
			mapping: {
				cat: "CatDto",
			},
			propertyName: "kind",
			shouldKeepDiscriminatorProperty: true,
		},
		entity: ObjectEntity,
		generatedDTOs: {
			CatDto,
		},
		isDynamicallyGenerated: true,
		isRequired: true,
		shouldValidateNested: true,
		type: [CatDto],
	})
	public dynamic!: CatDto;
}
