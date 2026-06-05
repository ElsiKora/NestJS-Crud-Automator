import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";

export class E2eCustomRouteDiscriminatedVerificationResponseDto {
	@Expose()
	public bodyClass!: string;

	@ApiProperty()
	@Expose()
	public mode!: string;

	@Expose()
	public verificationToken!: string;
}
