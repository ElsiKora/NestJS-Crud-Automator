import type { TApiRequestTransformer } from "@type/api-request-transformer.type";
import type { TApiControllerReadParameterTransformer } from "@type/decorator/api/controller";

export type TApiControllerRuntimeTransformer<E> = TApiControllerReadParameterTransformer<E> | TApiRequestTransformer<E>;
