import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class RuntimeRouteEmailBodyDTO {
	@ApiProperty()
	@IsString()
	public channel!: string;

	@IsString()
	public email!: string;
}
