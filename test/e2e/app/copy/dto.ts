import { ApiPropertyCopy, EApiDtoType, EApiRouteType } from "../../../../dist/esm/index";

import { E2eEntity } from "../entity";

export class E2eCopyDto {
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
