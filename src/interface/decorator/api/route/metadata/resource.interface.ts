import type { EApiAction } from "@enum/decorator/api/action.enum";
import type { Type } from "@nestjs/common";

export interface IApiRouteResourceMetadata<E> {
	action: EApiAction | string;
	entity: Type<E>;
}
