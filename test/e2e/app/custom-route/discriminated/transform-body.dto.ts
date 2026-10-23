import { ConflictException } from "@nestjs/common";
import { ApiProperty } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { IsOptional, IsString } from "class-validator";

export class E2eCustomRouteDiscriminatedTransformBodyDto {
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
			throw new ConflictException("TRANSFORM_REJECTED");
		}

		return value;
	})
	public token?: string;
}
