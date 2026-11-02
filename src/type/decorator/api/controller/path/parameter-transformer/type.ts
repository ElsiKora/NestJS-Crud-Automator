import type { TApiRequestTransformer } from "@type/api-request-transformer.type";

import type { TApiControllerPathParameterTransformerWithStringKey } from "./with-string-key.type";

export type TApiControllerPathParameterTransformer<E> = TApiControllerPathParameterTransformerWithStringKey<TApiRequestTransformer<E>>;
