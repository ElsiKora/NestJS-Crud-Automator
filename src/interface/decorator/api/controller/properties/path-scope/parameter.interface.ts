import type { TApiControllerPathDirectScalarField } from "@type/decorator/api/controller";

export interface IApiControllerPropertiesPathScopeParameter<E> {
	field: TApiControllerPathDirectScalarField<E>;
	parameter: string;
}
