import type { EFilterOrderDirection } from "@enum/filter";
import type { TApiControllerReadDirectScalarField } from "@type/decorator/api/controller";

export interface IApiControllerPropertiesRouteGetListQueryOrderEntry<E> {
	direction: EFilterOrderDirection;
	field: TApiControllerReadDirectScalarField<E>;
}
