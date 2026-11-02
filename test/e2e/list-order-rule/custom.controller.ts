import { Controller, HttpStatus, Query, RequestMethod } from "@nestjs/common";
import { ApiProperty } from "@nestjs/swagger";

import { ApiRouteCustom, EApiDtoType, EApiRouteType } from "../../../src/index";

import { E2eListOrderRuleItemEntity } from "./item.entity";

class E2eListOrderRuleLabelItemDto {
	@ApiProperty({ type: String })
	public label!: string;
}

class E2eListOrderRuleRankItemDto {
	@ApiProperty({ type: Number })
	public rank!: number;
}

/**
 * Declares a list response class named E2eListOrderRuleSharedList, as two modules may.
 * @param {new () => unknown} itemType - Item class of the list.
 * @returns {new () => unknown} The list response class.
 */
function createSharedList(itemType: new () => unknown): new () => unknown {
	class E2eListOrderRuleSharedList {
		@ApiProperty({ type: [itemType] })
		public items!: Array<unknown>;
	}

	return E2eListOrderRuleSharedList;
}

const LABEL_LIST: new () => unknown = createSharedList(E2eListOrderRuleLabelItemDto);
const RANK_LIST: new () => unknown = createSharedList(E2eListOrderRuleRankItemDto);

@Controller("list-order-rule/shared-label")
export class E2eListOrderRuleSharedLabelController {
	@ApiRouteCustom<E2eListOrderRuleItemEntity>({ autoDto: { [EApiDtoType.QUERY]: {} }, resource: { action: "list-order-rule.shared-label", entity: E2eListOrderRuleItemEntity }, response: { status: HttpStatus.OK, type: LABEL_LIST }, route: { method: RequestMethod.GET, path: "", type: EApiRouteType.GET_LIST } })
	public list(@Query() _query: unknown): { items: Array<unknown> } {
		return { items: [] };
	}
}

@Controller("list-order-rule/shared-rank")
export class E2eListOrderRuleSharedRankController {
	@ApiRouteCustom<E2eListOrderRuleItemEntity>({ autoDto: { [EApiDtoType.QUERY]: {} }, resource: { action: "list-order-rule.shared-rank", entity: E2eListOrderRuleItemEntity }, response: { status: HttpStatus.OK, type: RANK_LIST }, route: { method: RequestMethod.GET, path: "", type: EApiRouteType.GET_LIST } })
	public list(@Query() _query: unknown): { items: Array<unknown> } {
		return { items: [] };
	}
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
