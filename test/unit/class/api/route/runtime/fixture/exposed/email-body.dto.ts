import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import { IsString } from "class-validator";

export class RuntimeRouteExposedEmailBodyDTO {
	@ApiProperty()
	@Expose()
	@IsString()
	public channel!: string;

	@Expose()
	@IsString()
	public email!: string;
}
