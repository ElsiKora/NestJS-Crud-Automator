import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import { IsString } from "class-validator";

export class RuntimeRouteExposedPhoneBodyDTO {
	@ApiProperty()
	@Expose()
	@IsString()
	public channel!: string;

	@Expose()
	@IsString()
	public phone!: string;
}
