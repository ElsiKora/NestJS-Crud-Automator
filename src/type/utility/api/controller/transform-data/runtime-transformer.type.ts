import type { TApiRequestTransformer } from "@type/api-request-transformer.type";
import type { TApiControllerPathParameterTransformer } from "@type/decorator/api/controller";

export type TApiControllerRuntimeTransformer<E> = TApiControllerPathParameterTransformer<E> | TApiRequestTransformer<E>;
