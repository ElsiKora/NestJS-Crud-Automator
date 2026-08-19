import type { TApiRequestTransformer } from "@type/api-request-transformer.type";

import type { TApiControllerReadParameterTransformerWithStringKey } from "./with-string-key.type";

export type TApiControllerReadParameterTransformer<E> = TApiControllerReadParameterTransformerWithStringKey<TApiRequestTransformer<E>>;
