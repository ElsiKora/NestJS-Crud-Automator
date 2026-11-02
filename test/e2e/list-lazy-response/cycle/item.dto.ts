import { ApiProperty } from "@nestjs/swagger";

export class E2eListLazyCycleItemDto {
	@ApiProperty({ type: String })
	public label!: string;
}
