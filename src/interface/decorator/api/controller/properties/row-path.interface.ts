import type { TApiControllerReadDirectScalarField } from "@type/decorator/api/controller";

export interface IApiControllerPropertiesRowPath<E> {
	fields: ReadonlyArray<TApiControllerReadDirectScalarField<E>>;
}
