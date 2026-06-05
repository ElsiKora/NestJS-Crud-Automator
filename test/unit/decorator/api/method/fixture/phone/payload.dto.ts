import { ApiProperty } from "@nestjs/swagger";

export class MethodPhonePayloadDto {
	@ApiProperty()
	public channel!: string;

	@ApiProperty()
	public phone!: string;
}
