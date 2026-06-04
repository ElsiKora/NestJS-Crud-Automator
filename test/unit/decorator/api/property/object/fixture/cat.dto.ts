import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class CatDto {
	@ApiProperty()
	@IsString()
	public kind!: string;
}
