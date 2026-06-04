import { ApiProperty } from "@nestjs/swagger";

export class RouteDiscriminatorUnusedDto {
	@ApiProperty()
	public channel!: string;
}
