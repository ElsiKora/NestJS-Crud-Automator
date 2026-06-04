import { ApiPropertyObject } from "@decorator/api/property/object.decorator";

import { CatDto } from "./cat.dto";
import { DogDto } from "./dog.dto";
import { ObjectEntity } from "./entity";

export class DiscriminatorDto {
	@ApiPropertyObject({
		description: "pet",
		discriminator: {
			mapping: {
				cat: CatDto,
				dog: DogDto,
			},
			propertyName: "kind",
			shouldKeepDiscriminatorProperty: true,
		},
		entity: ObjectEntity,
		isRequired: true,
		shouldValidateNested: true,
		type: [CatDto, DogDto],
	})
	public pet!: CatDto | DogDto;
}
