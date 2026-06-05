import { ApiProperty } from "@nestjs/swagger";

export class RouteDiscriminatorPhoneDto {
	@ApiProperty()
	public channel!: string;
}
