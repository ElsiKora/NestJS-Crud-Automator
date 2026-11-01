import "reflect-metadata";

import { MetadataStorage } from "@class/metadata-storage.class";
import { EApiRouteType } from "@enum/decorator/api";
import { ApiRouteResponseIsListEnvelope } from "@utility/api/route/response/is-list-envelope.utility";
import { Column, Entity, OneToMany, PrimaryColumn } from "typeorm";
import { describe, expect, it } from "vitest";

class PlainEntity {}

@Entity("is_list_envelope_columns")
class ItemsColumnEntity {
	@PrimaryColumn({ type: "varchar" })
	public id!: string;

	@Column({ type: "simple-json" })
	public items!: Array<string>;
}

class InheritedItemsColumnEntity extends ItemsColumnEntity {}

@Entity("is_list_envelope_relations")
class ItemsRelationEntity {
	@PrimaryColumn({ type: "varchar" })
	public id!: string;

	@OneToMany(() => ItemsColumnEntity, "id")
	public items!: Array<ItemsColumnEntity>;
}

const ENVELOPE: { items: Array<unknown>; totalCount: number } = { items: [], totalCount: 0 };

describe("ApiRouteResponseIsListEnvelope", () => {
	it("is an envelope on GET_LIST whatever the entity owns", () => {
		expect(ApiRouteResponseIsListEnvelope(ENVELOPE, EApiRouteType.GET_LIST, ItemsColumnEntity)).toBe(true);
		expect(ApiRouteResponseIsListEnvelope(ENVELOPE, EApiRouteType.GET_LIST, PlainEntity)).toBe(true);
	});

	it.each([EApiRouteType.CREATE, EApiRouteType.GET, EApiRouteType.PARTIAL_UPDATE, EApiRouteType.UPDATE])("is an entity on declared route type %s", (routeType: EApiRouteType) => {
		expect(ApiRouteResponseIsListEnvelope(ENVELOPE, routeType, PlainEntity)).toBe(false);
	});

	it("is an envelope on an undeclared route type when the entity has no items property", () => {
		expect(ApiRouteResponseIsListEnvelope(ENVELOPE, undefined, PlainEntity)).toBe(true);
	});

	it.each([
		["column", ItemsColumnEntity],
		["inherited column", InheritedItemsColumnEntity],
		["relation", ItemsRelationEntity],
	])("is an entity on an undeclared route type when the entity owns an items %s", (_name: string, entity: new () => unknown) => {
		expect(ApiRouteResponseIsListEnvelope(ENVELOPE, undefined, entity)).toBe(false);
	});

	it("is an entity on an undeclared route type when only Automator metadata describes items", () => {
		class DescribedItemsEntity {}

		MetadataStorage.getInstance().setMetadata(DescribedItemsEntity.name, "items", "described", {});

		expect(ApiRouteResponseIsListEnvelope(ENVELOPE, undefined, DescribedItemsEntity)).toBe(false);
	});

	it("is an envelope without entity metadata on an undeclared route type", () => {
		expect(ApiRouteResponseIsListEnvelope(ENVELOPE)).toBe(true);
	});

	it.each([null, undefined, "items", [], { items: "not-an-array" }, { id: "entity" }])("is not an envelope for %j", (response: unknown) => {
		expect(ApiRouteResponseIsListEnvelope(response, EApiRouteType.GET_LIST, PlainEntity)).toBe(false);
	});
});
