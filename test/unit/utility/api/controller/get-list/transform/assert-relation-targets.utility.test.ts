import "reflect-metadata";

import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiEntity, IApiEntityColumn } from "@interface/entity";

import { PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT } from "@constant/decorator/api";
import { EApiDtoType, EApiPropertyDescribeType, EApiRouteType } from "@enum/decorator/api";
import { EFilterOperation } from "@enum/filter";
import { ApiControllerGetListTransformAssertRelationTargets } from "@utility/api/controller/get-list/transform/assert-relation-targets.utility";
import { ApiControllerGetListTransformFilter } from "@utility/api/controller/get-list/transform/filter.utility";
import { Entity, PrimaryGeneratedColumn } from "typeorm";
import { describe, expect, it } from "vitest";

@Entity("assert_relation_owners")
class AssertRelationOwner {
	@PrimaryGeneratedColumn("uuid")
	public id!: string;
}

@Entity("assert_relation_duplicate_first_owners")
class AssertRelationDuplicateOwner {
	@PrimaryGeneratedColumn("uuid")
	public id!: string;
}

((): unknown => {
	@Entity("assert_relation_duplicate_second_owners")
	class AssertRelationDuplicateOwner {
		@PrimaryGeneratedColumn("uuid")
		public id!: string;
	}

	return AssertRelationDuplicateOwner;
})();

function createEntityMetadata(target: IApiBaseEntity, type: string = "many-to-one", describeProperties: object = { type: EApiPropertyDescribeType.RELATION }): IApiEntity<object> {
	const column = { isPrimary: false, metadata: { [PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY]: describeProperties }, name: "owner", relation: { target }, type } as unknown as IApiEntityColumn<object>;

	return { columns: [column], name: "AssertRelationHolder", primaryKey: undefined, tableName: "assert_relation_holders" };
}

function createOverrideMetadata(firstTarget: IApiBaseEntity, secondTarget: IApiBaseEntity): IApiEntity<object> {
	const metadata: IApiEntity<object> = createEntityMetadata(firstTarget);

	return { ...metadata, columns: [...metadata.columns, ...createEntityMetadata(secondTarget).columns] };
}

describe("ApiControllerGetListTransformAssertRelationTargets", () => {
	it.each([
		["a good target before an ambiguous one", { name: AssertRelationOwner.name }, { name: AssertRelationDuplicateOwner.name }, false],
		["an ambiguous target before a good one", { name: AssertRelationDuplicateOwner.name }, { name: AssertRelationOwner.name }, true],
	])("agrees with the request filter on %s under one property name", (_case, firstTarget, secondTarget, isAmbiguous) => {
		const metadata: IApiEntity<object> = createOverrideMetadata(firstTarget, secondTarget);
		const assertTargets = (): void => ApiControllerGetListTransformAssertRelationTargets(metadata);
		const filter = (): unknown => ApiControllerGetListTransformFilter({ "owner.id[operator]": EFilterOperation.EQ, "owner.id[value]": "x" }, metadata);

		if (isAmbiguous) {
			expect(assertTargets).toThrowError("matches 2 entity classes");
			expect(filter).toThrowError("matches 2 entity classes");
		} else {
			expect(assertTargets).not.toThrow();
			expect(filter).not.toThrow();
		}
	});

	it("checks to-one relations only", () => {
		const target = { name: AssertRelationDuplicateOwner.name };

		expect(() => ApiControllerGetListTransformAssertRelationTargets(createEntityMetadata(target, "one-to-many"))).not.toThrow();
		expect(() => ApiControllerGetListTransformAssertRelationTargets(createEntityMetadata(target, "many-to-many"))).not.toThrow();
	});

	it("accepts a class, a name of one entity class, and a name of no entity class", () => {
		expect(() => ApiControllerGetListTransformAssertRelationTargets(createEntityMetadata(AssertRelationOwner))).not.toThrow();
		expect(() => ApiControllerGetListTransformAssertRelationTargets(createEntityMetadata({ name: AssertRelationOwner.name }))).not.toThrow();
		expect(() => ApiControllerGetListTransformAssertRelationTargets(createEntityMetadata({ name: "AssertRelationUnknownOwner" }))).not.toThrow();
	});

	it.each(["many-to-one", "one-to-one"])("fails for a %s relation target that names several entity classes", (type) => {
		expect(() => ApiControllerGetListTransformAssertRelationTargets(createEntityMetadata({ name: AssertRelationDuplicateOwner.name }, type))).toThrowError(`Metadata target "${AssertRelationDuplicateOwner.name}" matches 2 entity classes in TypeORM metadata`);
	});

	it("skips a column that is not a described relation", () => {
		expect(() => ApiControllerGetListTransformAssertRelationTargets(createEntityMetadata({ name: AssertRelationDuplicateOwner.name }, "many-to-one", { type: EApiPropertyDescribeType.STRING }))).not.toThrow();
	});

	it("skips a relation hidden from the query DTO", () => {
		expect(() => ApiControllerGetListTransformAssertRelationTargets(createEntityMetadata({ name: AssertRelationDuplicateOwner.name }, "many-to-one", { properties: { [EApiRouteType.GET_LIST]: { [EApiDtoType.QUERY]: { isEnabled: false } } }, type: EApiPropertyDescribeType.RELATION }))).not.toThrow();
	});
});
