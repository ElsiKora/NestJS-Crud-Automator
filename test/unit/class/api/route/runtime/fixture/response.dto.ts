import { Expose } from "class-transformer";

export class RuntimeRouteResponseDTO {
	@Expose()
	public id!: string;

	@Expose()
	public responseSource!: string;
}
