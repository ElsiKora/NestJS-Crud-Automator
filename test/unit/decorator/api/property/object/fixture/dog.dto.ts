import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class DogDto {
	@ApiProperty()
	@IsString()
	public kind!: string;
}
