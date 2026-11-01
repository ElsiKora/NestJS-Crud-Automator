import { ApiPropertyUUID } from "../../../../src/index";

export class E2eToManyReviewReferenceDto {
	@ApiPropertyUUID({ entity: { name: "E2eToManyReview" }, isResponse: true })
	public id!: string;
}
