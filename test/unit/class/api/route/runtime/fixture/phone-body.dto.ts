import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class RuntimeRoutePhoneBodyDTO {
	@ApiProperty()
	@IsString()
	public channel!: string;

	@IsString()
	public phone!: string;
}
