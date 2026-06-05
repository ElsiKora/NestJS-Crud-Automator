import { ApiProperty } from "@nestjs/swagger";

export class MethodEmailPayloadDto {
	@ApiProperty()
	public channel!: string;

	@ApiProperty()
	public email!: string;
}
