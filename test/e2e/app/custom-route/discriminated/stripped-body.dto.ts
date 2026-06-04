import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class E2eCustomRouteDiscriminatedStrippedBodyDto {
	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	public channel?: string;

	@IsString()
	public token!: string;
}
