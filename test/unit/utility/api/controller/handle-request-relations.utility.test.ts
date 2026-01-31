import "reflect-metadata";

import type { IApiControllerProperties } from "@interface/decorator/api";

import { ApiServiceBase } from "@class/api";
import { EApiControllerLoadRelationsStrategy } from "@enum/decorator/api";
import { ApiControllerHandleRequestRelations } from "@utility/api/controller/handle-request-relations.utility";
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { describe, expect, it } from "vitest";

@Entity("relation_owners")
class RelationOwner {
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@Column({ type: "varchar" })
	public name!: string;
}

@Entity("relation_entities")
class RelationEntity {
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@ManyToOne(() => RelationOwner)
	public owner!: RelationOwner;
}

class RelationOwnerService extends ApiServiceBase<RelationOwner> {
	public override async get(): Promise<RelationOwner> {
		return { id: "owner-1", name: "Owner" };
	}
}

describe("ApiControllerHandleRequestRelations", () => {
	it("loads relations using auto strategy", async () => {
		const controller = {
			ownerService: new RelationOwnerService(),
		};
		const properties: IApiControllerProperties<RelationEntity> = {
			entity: RelationEntity,
			routes: {},
		};
		const relationConfig = {
			relationsLoadStrategy: EApiControllerLoadRelationsStrategy.AUTO,
			relationsToLoad: [],
			relationsServices: {},
			servicesLoadStrategy: EApiControllerLoadRelationsStrategy.AUTO,
			shouldLoadRelations: true,
			shouldForceAllServicesToBeSpecified: false,
		};
		const parameters: Partial<RelationEntity> = { owner: "owner-1" as never };

		await ApiControllerHandleRequestRelations(controller as never, properties, relationConfig as never, parameters);

		expect(parameters.owner).toMatchObject({ id: "owner-1" });
	});

	it("throws when service is missing in forced mode", async () => {
		const properties: IApiControllerProperties<RelationEntity> = {
			entity: RelationEntity,
			routes: {},
		};
		const relationConfig = {
			relationsLoadStrategy: EApiControllerLoadRelationsStrategy.AUTO,
			relationsToLoad: [],
			relationsServices: {},
			servicesLoadStrategy: EApiControllerLoadRelationsStrategy.AUTO,
			shouldForceAllServicesToBeSpecified: true,
			shouldLoadRelations: true,
		};
		const parameters: Partial<RelationEntity> = { owner: "owner-1" as never };

		await expect(ApiControllerHandleRequestRelations({} as never, properties, relationConfig as never, parameters)).rejects.toThrow("Service ownerService not found in controller");
	});

	it("throws when manual service name is not provided", async () => {
		const controller = {
			ownerService: new RelationOwnerService(),
		};
		const properties: IApiControllerProperties<RelationEntity> = {
			entity: RelationEntity,
			routes: {},
		};
		const relationConfig = {
			relationsLoadStrategy: EApiControllerLoadRelationsStrategy.AUTO,
			relationsToLoad: [],
			relationsServices: {},
			servicesLoadStrategy: EApiControllerLoadRelationsStrategy.MANUAL,
			shouldForceAllServicesToBeSpecified: false,
			shouldLoadRelations: true,
		};
		const parameters: Partial<RelationEntity> = { owner: "owner-1" as never };

		await expect(ApiControllerHandleRequestRelations(controller as never, properties, relationConfig as never, parameters)).rejects.toThrow("Service name not specified for property owner in manual mode");
	});

	it("throws when service is not an ApiServiceBase", async () => {
		const controller = {
			ownerService: {},
		};
		const properties: IApiControllerProperties<RelationEntity> = {
			entity: RelationEntity,
			routes: {},
		};
		const relationConfig = {
			relationsLoadStrategy: EApiControllerLoadRelationsStrategy.AUTO,
			relationsToLoad: [],
			relationsServices: {},
			servicesLoadStrategy: EApiControllerLoadRelationsStrategy.AUTO,
			shouldForceAllServicesToBeSpecified: false,
			shouldLoadRelations: true,
		};
		const parameters: Partial<RelationEntity> = { owner: "owner-1" as never };

		await expect(ApiControllerHandleRequestRelations(controller as never, properties, relationConfig as never, parameters)).rejects.toThrow("Service ownerService is not an instance of BaseApiService");
	});

	it("skips relations not listed in manual load strategy", async () => {
		const controller = {
			ownerService: new RelationOwnerService(),
		};
		const properties: IApiControllerProperties<RelationEntity> = {
			entity: RelationEntity,
			routes: {},
		};
		const relationConfig = {
			relationsLoadStrategy: EApiControllerLoadRelationsStrategy.MANUAL,
			relationsToLoad: [],
			relationsServices: {},
			servicesLoadStrategy: EApiControllerLoadRelationsStrategy.AUTO,
			shouldForceAllServicesToBeSpecified: false,
			shouldLoadRelations: true,
		};
		const parameters: Partial<RelationEntity> = { owner: "owner-1" as never };

		await ApiControllerHandleRequestRelations(controller as never, properties, relationConfig as never, parameters);

		expect(parameters.owner).toBe("owner-1");
	});

	it("loads relations using manual service mapping", async () => {
		class CustomOwnerService extends ApiServiceBase<RelationOwner> {
			public override async get(): Promise<RelationOwner> {
				return { id: "owner-2", name: "Custom" };
			}
		}

		const controller = {
			customOwnerService: new CustomOwnerService(),
		};
		const properties: IApiControllerProperties<RelationEntity> = {
			entity: RelationEntity,
			routes: {},
		};
		const relationConfig = {
			relationsLoadStrategy: EApiControllerLoadRelationsStrategy.AUTO,
			relationsToLoad: [],
			relationsServices: { owner: "customOwnerService" },
			servicesLoadStrategy: EApiControllerLoadRelationsStrategy.MANUAL,
			shouldForceAllServicesToBeSpecified: false,
			shouldLoadRelations: true,
		};
		const parameters: Partial<RelationEntity> = { owner: "owner-2" as never };

		await ApiControllerHandleRequestRelations(controller as never, properties, relationConfig as never, parameters);

		expect(parameters.owner).toMatchObject({ id: "owner-2" });
	});

	it("throws when relation id is invalid", async () => {
		class MissingOwnerService extends ApiServiceBase<RelationOwner> {
			public override async get(): Promise<RelationOwner> {
				return undefined as never;
			}
		}

		const controller = {
			ownerService: new MissingOwnerService(),
		};
		const properties: IApiControllerProperties<RelationEntity> = {
			entity: RelationEntity,
			routes: {},
		};
		const relationConfig = {
			relationsLoadStrategy: EApiControllerLoadRelationsStrategy.AUTO,
			relationsToLoad: [],
			relationsServices: {},
			servicesLoadStrategy: EApiControllerLoadRelationsStrategy.AUTO,
			shouldForceAllServicesToBeSpecified: false,
			shouldLoadRelations: true,
		};
		const parameters: Partial<RelationEntity> = { owner: "missing" as never };

		await expect(ApiControllerHandleRequestRelations(controller as never, properties, relationConfig as never, parameters)).rejects.toThrow("Invalid owner ID");
	});

	it("throws when manual service name is empty", async () => {
		const controller = {
			ownerService: new RelationOwnerService(),
		};
		const properties: IApiControllerProperties<RelationEntity> = {
			entity: RelationEntity,
			routes: {},
		};
		const relationConfig = {
			relationsLoadStrategy: EApiControllerLoadRelationsStrategy.AUTO,
			relationsToLoad: [],
			relationsServices: { owner: "" },
			servicesLoadStrategy: EApiControllerLoadRelationsStrategy.MANUAL,
			shouldForceAllServicesToBeSpecified: false,
			shouldLoadRelations: true,
		};
		const parameters: Partial<RelationEntity> = { owner: "owner-1" as never };

		await expect(ApiControllerHandleRequestRelations(controller as never, properties, relationConfig as never, parameters)).rejects.toThrow("Service name not specified for property owner");
	});

	it("skips missing services when not forced", async () => {
		const properties: IApiControllerProperties<RelationEntity> = {
			entity: RelationEntity,
			routes: {},
		};
		const relationConfig = {
			relationsLoadStrategy: EApiControllerLoadRelationsStrategy.AUTO,
			relationsToLoad: [],
			relationsServices: {},
			servicesLoadStrategy: EApiControllerLoadRelationsStrategy.AUTO,
			shouldForceAllServicesToBeSpecified: false,
			shouldLoadRelations: true,
		};
		const parameters: Partial<RelationEntity> = { owner: "owner-1" as never };

		await ApiControllerHandleRequestRelations({} as never, properties, relationConfig as never, parameters);

		expect(parameters.owner).toBe("owner-1");
	});
});
