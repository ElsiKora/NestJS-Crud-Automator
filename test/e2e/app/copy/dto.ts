import { ApiPropertyCopy, EApiDtoType, EApiRouteType } from "../../../../src/index";

import { E2eEntity } from "../entity";

export class E2eCopyDto {
	@ApiPropertyCopy({
		entity: E2eEntity,
		propertyName: "internalReference",
		method: EApiRouteType.CREATE,
		dtoType: EApiDtoType.BODY,
	})
	public internalReference?: string;

	@ApiPropertyCopy({
		entity: E2eEntity,
		propertyName: "name",
		method: EApiRouteType.CREATE,
		dtoType: EApiDtoType.BODY,
	})
	public name!: string;

	@ApiPropertyCopy({
		entity: E2eEntity,
		propertyName: "count",
		method: EApiRouteType.CREATE,
		dtoType: EApiDtoType.BODY,
	})
	public count!: number;
}
