import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class E2eCustomRouteDiscriminatedUsernameBodyDto {
	@ApiProperty()
	@IsString()
	public channel!: string;

	@IsString()
	public username!: string;
}
