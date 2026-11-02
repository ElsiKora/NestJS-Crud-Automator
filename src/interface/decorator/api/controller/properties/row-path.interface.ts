import type { TApiControllerPathDirectScalarField } from "@type/decorator/api/controller";

export interface IApiControllerPropertiesRowPath<E> {
	fields: ReadonlyArray<TApiControllerPathDirectScalarField<E>>;
}
