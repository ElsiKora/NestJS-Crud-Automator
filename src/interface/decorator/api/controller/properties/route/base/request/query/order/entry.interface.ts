import type { EFilterOrderDirection } from "@enum/filter";
import type { TApiControllerPathDirectScalarField } from "@type/decorator/api/controller";

export interface IApiControllerPropertiesRouteGetListQueryOrderEntry<E> {
	direction: EFilterOrderDirection;
	field: TApiControllerPathDirectScalarField<E>;
}
