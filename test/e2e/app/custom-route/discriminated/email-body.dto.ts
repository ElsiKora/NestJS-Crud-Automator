import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class E2eCustomRouteDiscriminatedEmailBodyDto {
	@ApiProperty()
	@IsString()
	public channel!: string;

	@IsString()
	public email!: string;
}
