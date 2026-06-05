import { ApiProperty } from "@nestjs/swagger";

export class RouteDiscriminatorEmailDto {
	@ApiProperty()
	public channel!: string;
}
