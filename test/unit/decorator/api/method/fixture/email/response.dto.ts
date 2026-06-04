import { ApiPropertyObject } from "@decorator/api/property";
import { ApiProperty } from "@nestjs/swagger";

import { MethodEntity } from "../entity";
import { MethodPhonePayloadDto } from "../phone";
import { MethodEmailPayloadDto } from "./payload.dto";

export class MethodEmailResponseDto {
	@ApiProperty()
	public channel!: string;

	@ApiPropertyObject({
		discriminator: {
			mapping: {
				email: MethodEmailPayloadDto,
				phone: MethodPhonePayloadDto,
			},
			propertyName: "channel",
			shouldKeepDiscriminatorProperty: true,
		},
		entity: MethodEntity,
		isRequired: true,
		shouldValidateNested: true,
		type: [MethodEmailPayloadDto, MethodPhonePayloadDto],
	})
	public payload!: MethodEmailPayloadDto | MethodPhonePayloadDto;
}
