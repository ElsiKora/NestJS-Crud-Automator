import { Expose } from "class-transformer";

export class E2eCustomRouteResponseDto {
	@Expose()
	public code?: string;

	@Expose()
	public count?: number;

	@Expose()
	public id!: string;

	@Expose()
	public name!: string;

	@Expose()
	public responseSignature?: string;
}
