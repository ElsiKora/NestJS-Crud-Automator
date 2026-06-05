import { ApiProperty } from "@nestjs/swagger";

export class RouteCustomPhoneResponseDto {
	@ApiProperty()
	public channel!: string;
}
