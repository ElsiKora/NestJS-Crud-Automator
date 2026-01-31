import { Injectable } from "@nestjs/common";

import { ApiService, ApiServiceBase, ApiServiceObservable } from "../../../../dist/esm/index";

import { E2eEntity } from "../entity";

@Injectable()
@ApiServiceObservable()
@ApiService({ entity: E2eEntity })
export class E2eBrokenService extends ApiServiceBase<E2eEntity> {}
