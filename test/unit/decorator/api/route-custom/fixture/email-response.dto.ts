import { ApiProperty } from "@nestjs/swagger";

export class RouteCustomEmailResponseDto {
	@ApiProperty()
	public channel!: string;
}
