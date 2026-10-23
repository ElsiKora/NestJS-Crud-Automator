import { ConflictException } from "@nestjs/common";
import { ApiProperty } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { IsOptional, IsString } from "class-validator";

export const RUNTIME_ROUTE_TRANSFORM_ERROR: ConflictException = new ConflictException("TRANSFORM_REJECTED");

export class RuntimeRouteTransformBodyDTO {
	@ApiProperty()
	@IsString()
	public channel!: string;

	@IsOptional()
	@Type(() => Buffer)
	public payload?: Buffer;

	@IsOptional()
	@IsString()
	@Transform(({ value }: { value: unknown }): unknown => {
		if (value === "reject") {
			throw RUNTIME_ROUTE_TRANSFORM_ERROR;
		}

		return value;
	})
	public token?: string;
}
