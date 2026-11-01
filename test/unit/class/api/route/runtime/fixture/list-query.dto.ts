import { Type } from "class-transformer";
import { IsInt, Min } from "class-validator";

export class RuntimeRouteListQueryDTO {
	@IsInt()
	@Min(1)
	@Type(() => Number)
	public limit!: number;

	@IsInt()
	@Min(1)
	@Type(() => Number)
	public page!: number;
}
