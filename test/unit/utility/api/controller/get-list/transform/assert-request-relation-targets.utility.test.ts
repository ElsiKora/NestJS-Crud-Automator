import "reflect-metadata";

import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiEntity, IApiEntityColumn } from "@interface/entity";

import { PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT } from "@constant/decorator/api";
import { EApiPropertyDescribeType } from "@enum/decorator/api";
import { ApiControllerGetListTransformAssertRequestRelationTargets } from "@utility/api/controller/get-list/transform/assert-request-relation-targets.utility";
import { ResolveRelationTarget } from "@utility/resolve/relation-target.utility";
import { Entity, PrimaryGeneratedColumn } from "typeorm";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@utility/resolve/relation-target.utility", async (importOriginal) => {
	const original = await importOriginal<typeof import("@utility/resolve/relation-target.utility")>();

	return { ResolveRelationTarget: vi.fn(original.ResolveRelationTarget) };
});

@Entity("assert_request_owners")
class AssertRequestOwner {
	@PrimaryGeneratedColumn("uuid")
	public id!: string;
}

function createEntityMetadata(target: IApiBaseEntity, type: string = "many-to-one"): IApiEntity<object> {
	const column = { isPrimary: false, metadata: { [PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY]: { type: EApiPropertyDescribeType.RELATION } }, name: "owner", relation: { target }, type } as unknown as IApiEntityColumn<object>;

	return { columns: [column], name: "AssertRequestHolder", primaryKey: undefined, tableName: "assert_request_holders" };
}

const relationQuery: Record<string, unknown> = { "owner.id[operator]": "eq", "owner.id[value]": "x" };

describe("ApiControllerGetListTransformAssertRequestRelationTargets", () => {
	beforeEach(() => {
		vi.mocked(ResolveRelationTarget).mockClear();
	});

	it("resolves a target once until the table registry grows", () => {
		const metadata: IApiEntity<object> = createEntityMetadata({ name: AssertRequestOwner.name });

		ApiControllerGetListTransformAssertRequestRelationTargets(relationQuery, metadata);
		ApiControllerGetListTransformAssertRequestRelationTargets(relationQuery, metadata);

		expect(ResolveRelationTarget).toHaveBeenCalledTimes(1);

		((): unknown => {
			@Entity("assert_request_unrelated")
			class AssertRequestUnrelated {
				@PrimaryGeneratedColumn("uuid")
				public id!: string;
			}

			return AssertRequestUnrelated;
		})();

		ApiControllerGetListTransformAssertRequestRelationTargets(relationQuery, metadata);

		expect(ResolveRelationTarget).toHaveBeenCalledTimes(2);
	});

	it("does not resolve anything for a query without a relation path or for a to-many relation", () => {
		ApiControllerGetListTransformAssertRequestRelationTargets({ limit: 10, "name[operator]": "eq" }, createEntityMetadata({ name: AssertRequestOwner.name }));
		ApiControllerGetListTransformAssertRequestRelationTargets(relationQuery, createEntityMetadata({ name: AssertRequestOwner.name }, "one-to-many"));
		ApiControllerGetListTransformAssertRequestRelationTargets({ "other.id[operator]": "eq" }, createEntityMetadata({ name: AssertRequestOwner.name }));

		expect(ResolveRelationTarget).not.toHaveBeenCalled();
	});

	it("fails after a second class with the target's name arrived, and keeps failing", () => {
		const metadata: IApiEntity<object> = createEntityMetadata({ name: "AssertRequestLateOwner" });

		const declareOwner = (table: string): unknown => {
			@Entity(table)
			class AssertRequestLateOwner {
				@PrimaryGeneratedColumn("uuid")
				public id!: string;
			}

			return AssertRequestLateOwner;
		};

		declareOwner("assert_request_late_first");

		expect(() => ApiControllerGetListTransformAssertRequestRelationTargets(relationQuery, metadata)).not.toThrow();

		declareOwner("assert_request_late_second");

		expect(() => ApiControllerGetListTransformAssertRequestRelationTargets(relationQuery, metadata)).toThrowError('Metadata target "AssertRequestLateOwner" matches 2 entity classes in TypeORM metadata');
		expect(() => ApiControllerGetListTransformAssertRequestRelationTargets(relationQuery, metadata)).toThrowError("matches 2 entity classes");
	});
});
