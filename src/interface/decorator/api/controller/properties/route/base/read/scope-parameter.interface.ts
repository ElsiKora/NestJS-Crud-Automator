import type { TApiControllerReadDirectScalarField } from "@type/decorator/api/controller";

export interface IApiControllerPropertiesRouteReadScopeParameter<E> {
	field: TApiControllerReadDirectScalarField<E>;
	parameter: string;
}
