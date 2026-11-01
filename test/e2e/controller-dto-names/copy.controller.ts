import { HttpStatus, Inject, RequestMethod } from "@nestjs/common";

import { ApiController, ApiPropertyCopy, ApiRouteCustom, EApiDtoType, EApiRouteType } from "../../../src/index";

import { E2eDtoNameOwnerEntity, E2eDtoNameRecordEntity } from "./record.entity";
import { E2eDtoNameRecordService } from "./record.service";

export class E2eDtoNameCopyHostDTO {
	@ApiPropertyCopy<E2eDtoNameRecordEntity>({ dtoType: EApiDtoType.RESPONSE, entity: E2eDtoNameRecordEntity, method: EApiRouteType.GET, propertyName: "owner" })
	public owner!: E2eDtoNameOwnerEntity;

	@ApiPropertyCopy<E2eDtoNameRecordEntity>({ dtoType: EApiDtoType.RESPONSE, entity: E2eDtoNameRecordEntity, metadata: { description: "previous owner" }, method: EApiRouteType.GET, propertyName: "owner" })
	public previousOwner!: E2eDtoNameOwnerEntity;

	@ApiPropertyCopy<E2eDtoNameRecordEntity>({ dtoType: EApiDtoType.RESPONSE, entity: E2eDtoNameRecordEntity, method: EApiRouteType.GET, propertyName: "details" })
	public details?: Record<string, unknown>;

	@ApiPropertyCopy<E2eDtoNameRecordEntity>({ dtoType: EApiDtoType.RESPONSE, entity: E2eDtoNameRecordEntity, metadata: { description: "previous details" }, method: EApiRouteType.GET, propertyName: "details" })
	public previousDetails?: Record<string, unknown>;
}

export class E2eDtoNameCopyContextDTO {
	@ApiPropertyCopy<E2eDtoNameRecordEntity>({ dtoType: EApiDtoType.RESPONSE, entity: E2eDtoNameRecordEntity, method: EApiRouteType.GET, propertyName: "owner" })
	public owner!: E2eDtoNameOwnerEntity;

	@ApiPropertyCopy<E2eDtoNameRecordEntity>({ dtoType: EApiDtoType.RESPONSE, entity: E2eDtoNameRecordEntity, method: EApiRouteType.GET_LIST, propertyName: "owner" })
	public listOwner!: E2eDtoNameOwnerEntity;
}

const NO_GENERATED_ROUTES = {
	[EApiRouteType.CREATE]: { generation: { isEnabled: false } },
	[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
	[EApiRouteType.GET]: { generation: { isEnabled: false } },
	[EApiRouteType.GET_LIST]: { generation: { isEnabled: false } },
	[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
	[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
} as const;

@ApiController<E2eDtoNameRecordEntity>({ entity: E2eDtoNameRecordEntity, path: "copy/dto-name-records", routes: NO_GENERATED_ROUTES })
export class E2eDtoNameCopyController {
	@Inject(E2eDtoNameRecordService)
	public readonly service!: E2eDtoNameRecordService;

	@ApiRouteCustom<E2eDtoNameRecordEntity>({
		resource: { action: "custom.host", entity: E2eDtoNameRecordEntity },
		response: { status: HttpStatus.OK, type: E2eDtoNameCopyHostDTO },
		route: { method: RequestMethod.GET, path: "host", type: EApiRouteType.GET },
	})
	public host(): void {}

	@ApiRouteCustom<E2eDtoNameRecordEntity>({
		resource: { action: "custom.context", entity: E2eDtoNameRecordEntity },
		response: { status: HttpStatus.OK, type: E2eDtoNameCopyContextDTO },
		route: { method: RequestMethod.GET, path: "context", type: EApiRouteType.GET },
	})
	public context(): void {}
}
