import { Controller, HttpStatus, Query, RequestMethod } from "@nestjs/common";
import { ApiProperty } from "@nestjs/swagger";

import { ApiRouteCustom, EApiDtoType, EApiRouteType } from "../../../src/index";

import { E2eListOrderRuleItemEntity } from "./item.entity";

class E2eListOrderRuleLabelItemDto {
	@ApiProperty({ type: String })
	public label!: string;
}

class E2eListOrderRuleLabelRankItemDto {
	@ApiProperty({ type: String })
	public label!: string;

	@ApiProperty({ type: Number })
	public rank!: number;
}

class E2eListOrderRuleVariantLabelListDto {
	@ApiProperty({ type: [E2eListOrderRuleLabelItemDto] })
	public items!: Array<E2eListOrderRuleLabelItemDto>;

	@ApiProperty({ type: String })
	public kind!: string;
}

class E2eListOrderRuleVariantLabelRankListDto {
	@ApiProperty({ type: [E2eListOrderRuleLabelRankItemDto] })
	public items!: Array<E2eListOrderRuleLabelRankItemDto>;

	@ApiProperty({ type: String })
	public kind!: string;
}

@Controller("list-order-rule/variants")
export class E2eListOrderRuleVariantController {
	@ApiRouteCustom<E2eListOrderRuleItemEntity>({
		autoDto: { [EApiDtoType.QUERY]: {} },
		resource: { action: "list-order-rule.variants", entity: E2eListOrderRuleItemEntity },
		response: { discriminator: { mapping: { label: E2eListOrderRuleVariantLabelListDto, rank: E2eListOrderRuleVariantLabelRankListDto }, propertyName: "kind" }, status: HttpStatus.OK, type: [E2eListOrderRuleVariantLabelListDto, E2eListOrderRuleVariantLabelRankListDto] },
		route: { method: RequestMethod.GET, path: "", type: EApiRouteType.GET_LIST },
	})
	public list(@Query() _query: unknown): { items: Array<unknown>; kind: string } {
		return { items: [], kind: "label" };
	}
}

@Controller("list-order-rule/plain-custom")
export class E2eListOrderRulePlainCustomController {
	@ApiRouteCustom<E2eListOrderRuleItemEntity>({ autoDto: { [EApiDtoType.QUERY]: {} }, resource: { action: "list-order-rule.plain-custom", entity: E2eListOrderRuleItemEntity }, route: { method: RequestMethod.GET, path: "", type: EApiRouteType.GET_LIST } })
	public list(@Query() _query: unknown): { items: Array<unknown> } {
		return { items: [] };
	}
}
