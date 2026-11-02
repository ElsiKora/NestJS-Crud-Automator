import type { IApiEntityColumn } from "@interface/entity";
import type { Type } from "@nestjs/common";

export interface IApiControllerParametersRule {
	/** The entity column each path parameter holds, where the route knows it. A database reads the value by this column's type, not as text. */
	columns?: ReadonlyMap<string, IApiEntityColumn<unknown>>;
	configuredDto?: Type<unknown>;
	dto: Type<unknown>;
	routeDtoProperties?: ReadonlyMap<string, string>;
}
