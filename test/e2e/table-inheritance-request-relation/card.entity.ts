import { ChildEntity, ManyToOne } from "typeorm";

import { ApiPropertyDescribe, EApiPropertyDescribeType } from "../../../src/index";

import { RequestRelationIssuerEntity } from "./issuer.entity";
import { RequestRelationDetailEntity } from "./root.entity";

@ChildEntity("CARD")
export class RequestRelationCardEntity extends RequestRelationDetailEntity {
	@ManyToOne(() => RequestRelationIssuerEntity, { nullable: true })
	@ApiPropertyDescribe({ description: "issuer", type: EApiPropertyDescribeType.RELATION })
	public issuer!: RequestRelationIssuerEntity;
}
