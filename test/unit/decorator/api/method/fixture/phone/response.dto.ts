import { ApiProperty } from "@nestjs/swagger";

export class MethodPhoneResponseDto {
	@ApiProperty()
	public channel!: string;
}
