import "reflect-metadata";

import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { TApiControllerPropertiesRoute } from "@type/decorator/api/controller";
import type { TApiPropertyDescribeProperties } from "@type/decorator/api/property";

import { ApiControllerGetListQueryPlanCompiler } from "@class/api/controller/get-list/query";
import { ApiPropertyDescribe } from "@decorator/api/property/describe.decorator";
import { EFilterOperation, EFilterOrderDirection } from "@enum/filter";
import { EApiControllerGetListQueryPaginationMode, EApiControllerGetListQueryUnlistedFields, EApiControllerRequestTarget, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "@enum/decorator/api";
import { GenerateEntityInformation } from "@utility/generate-entity-information.utility";
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { describe, expect, it } from "vitest";

@Entity("plan_ambiguous_owner_first")
class PlanAmbiguousOwner {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ description: "owner id", type: EApiPropertyDescribeType.UUID } as TApiPropertyDescribeProperties)
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({ description: "owner label", exampleValue: "label", format: EApiPropertyStringType.STRING, maxLength: 32, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING } as TApiPropertyDescribeProperties)
	public label!: string;
}

// A second entity class with the owner's name makes the string relation target ambiguous.
((): unknown => {
	@Entity("plan_ambiguous_owner_second")
	class PlanAmbiguousOwner {
		@PrimaryGeneratedColumn("uuid")
		public id!: string;
	}

	return PlanAmbiguousOwner;
})();

@Entity("plan_ambiguous_holders")
class PlanAmbiguousHolder {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ description: "holder id", type: EApiPropertyDescribeType.UUID } as TApiPropertyDescribeProperties)
	public id!: string;

	@ManyToOne("PlanAmbiguousOwner")
	@ApiPropertyDescribe({ description: "owner", type: EApiPropertyDescribeType.RELATION } as TApiPropertyDescribeProperties)
	public owner!: PlanAmbiguousOwner;
}

const planSameNameNoteDescribe = { description: "note", exampleValue: "note", format: EApiPropertyStringType.STRING, maxLength: 32, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING } as TApiPropertyDescribeProperties;

@Entity("plan_same_name_first")
class PlanSameNameEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID } as TApiPropertyDescribeProperties)
	public id!: string;

	@Column({ nullable: true, type: "varchar" })
	@ApiPropertyDescribe(planSameNameNoteDescribe)
	public note!: null | string;
}

const PlanSameNameSecondEntity: new () => { id: string; note: string } = ((): new () => { id: string; note: string } => {
	@Entity("plan_same_name_second")
	class PlanSameNameEntity {
		@PrimaryGeneratedColumn("uuid")
		@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID } as TApiPropertyDescribeProperties)
		public id!: string;

		@Column({ type: "varchar" })
		@ApiPropertyDescribe(planSameNameNoteDescribe)
		public note!: string;
	}

	return PlanSameNameEntity;
})();

class PlanAmbiguousController {}

describe("ApiControllerGetListQueryPlanCompiler", () => {
	it.each([
		["PAGE", EApiControllerGetListQueryPaginationMode.PAGE],
		["CURSOR", EApiControllerGetListQueryPaginationMode.CURSOR],
	])("reads column nullability from the class itself under %s when another class has its name", (_mode, mode) => {
		const isNoteNullable = <E extends IApiBaseEntity>(entity: new () => E): boolean | undefined => {
			const routeConfig = {
				request: { [EApiControllerRequestTarget.QUERY]: { filter: { fields: { note: { allowedOperations: [EFilterOperation.EQ], isEnabled: true } }, unlistedFields: EApiControllerGetListQueryUnlistedFields.INHERIT }, order: { fields: {}, tieBreakers: [{ direction: EFilterOrderDirection.ASC, field: "id" }], unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT }, pagination: { mode } } },
			} as unknown as TApiControllerPropertiesRoute<E, EApiRouteType.GET_LIST>;

			return ApiControllerGetListQueryPlanCompiler.compile(PlanAmbiguousController, entity, GenerateEntityInformation<E>(entity as unknown as IApiBaseEntity), routeConfig)?.filter.fields.note?.isNullable;
		};

		expect(isNoteNullable(PlanSameNameEntity)).toBe(true);
		expect(isNoteNullable(PlanSameNameSecondEntity)).toBe(false);
	});

	it("fails to compile when a to-one string relation target names several entity classes", () => {
		const routeConfig = {
			request: {
				[EApiControllerRequestTarget.QUERY]: {
					pagination: { mode: EApiControllerGetListQueryPaginationMode.PAGE },
				},
			},
		} as unknown as TApiControllerPropertiesRoute<PlanAmbiguousHolder, EApiRouteType.GET_LIST>;
		const entityMetadata = GenerateEntityInformation<PlanAmbiguousHolder>(PlanAmbiguousHolder as unknown as IApiBaseEntity);

		expect(() => ApiControllerGetListQueryPlanCompiler.compile(PlanAmbiguousController, PlanAmbiguousHolder, entityMetadata, routeConfig)).toThrowError('Metadata target "PlanAmbiguousOwner" matches 2 entity classes in TypeORM metadata');
	});
});
