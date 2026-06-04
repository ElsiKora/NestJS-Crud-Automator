import { IsString } from "class-validator";

export class ChildDto {
	@IsString()
	public name!: string;
}
