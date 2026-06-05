import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";

export class RuntimeRouteSessionResponseDTO {
	@Expose()
	public id!: string;

	@ApiProperty()
	@Expose()
	public mode!: string;

	@Expose()
	public sessionToken!: string;
}
