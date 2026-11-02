import "reflect-metadata";

import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiControllerPropertiesRouteBaseRelationsRequest } from "@interface/decorator/api";

import { ApiServiceBase } from "@class/api";
import { ApiControllerRequestRelationsValidator } from "@class/api/controller/request-relations-validator.class";
import { EApiControllerRelationReferenceShape } from "@enum/decorator/api";
import { Column, DataSource, Entity, ManyToOne, PrimaryGeneratedColumn, Repository } from "typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const OWNER: string = "Route";
const SCALAR_REFERENCE = { shape: EApiControllerRelationReferenceShape.SCALAR };

@Entity("validator_profiles")
class ValidatorProfileEntity {
	@PrimaryGeneratedColumn("uuid")
	public id!: string;
}

class ValidatorEmbedded {
	@Column({ nullable: true, type: "varchar" })
	public note!: string;

	@ManyToOne(() => ValidatorProfileEntity, { nullable: true })
	public profile!: ValidatorProfileEntity;
}

@Entity("validator_owners")
class ValidatorOwnerEntity {
	@Column(() => ValidatorEmbedded)
	public embedded!: ValidatorEmbedded;

	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@ManyToOne(() => ValidatorProfileEntity, { nullable: true })
	public profile!: ValidatorProfileEntity;
}

@Entity("validator_items")
class ValidatorItemEntity {
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@ManyToOne(() => ValidatorOwnerEntity, { nullable: true })
	public owner!: ValidatorOwnerEntity;
}

class ValidatorOwnerService extends ApiServiceBase<ValidatorOwnerEntity> {
	public constructor(public readonly repository: Repository<ValidatorOwnerEntity> | undefined) {
		super();
	}
}

function config(load: Record<string, unknown>, reference: unknown = SCALAR_REFERENCE): IApiControllerPropertiesRouteBaseRelationsRequest<IApiBaseEntity> {
	return { load, reference } as never;
}

function assertStatic(relationConfig: IApiControllerPropertiesRouteBaseRelationsRequest<IApiBaseEntity> | undefined): void {
	ApiControllerRequestRelationsValidator.assertStatic(ValidatorItemEntity as never, OWNER, relationConfig);
}

describe("ApiControllerRequestRelationsValidator", () => {
	describe("assertStatic", () => {
		it("accepts a missing configuration, a configuration without load, and a valid one", () => {
			expect(() => assertStatic(undefined)).not.toThrow();
			expect(() => assertStatic({ reference: SCALAR_REFERENCE })).not.toThrow();
			expect(() => assertStatic(config({ include: { owner: { profile: true } }, locks: { owner: { mode: "pessimistic_read" } }, relationLoadStrategy: "query" }))).not.toThrow();
			expect(() => assertStatic(config({ include: {} }))).not.toThrow();
		});

		it("rejects a malformed reference", () => {
			expect(() => assertStatic(config({ include: {} }, null))).toThrow("Route relations.request.reference is required");
			expect(() => assertStatic(config({ include: {} }, { shape: "OTHER" }))).toThrow("Route relations.request.reference.shape must be OBJECT or SCALAR");
			expect(() => assertStatic(config({ include: {} }, { key: "", shape: EApiControllerRelationReferenceShape.OBJECT }))).toThrow("Route relations.request.reference.key must not be empty");
		});

		it("rejects a malformed include or locks map", () => {
			for (const include of [undefined, null, [], true]) {
				expect(() => assertStatic(config({ include }))).toThrow("Route relations.request.load.include must be an object");
			}

			for (const locks of [null, [], "owner"]) {
				expect(() => assertStatic(config({ include: { owner: true }, locks }))).toThrow("Route relations.request.load.locks must be an object");
			}
		});

		it("rejects a malformed include value and an empty service override", () => {
			for (const includeValue of [null, 1, "owner", []]) {
				expect(() => assertStatic(config({ include: { owner: includeValue } }))).toThrow('Route relations.request key "owner" must include true, false or an object of nested relations');
			}

			expect(() => assertStatic(config({ include: { owner: true }, services: { owner: "" } }))).toThrow('Route relations.request key "owner" must not override its service with an empty name');
			expect(() => assertStatic(config({ include: { owner: false }, services: { owner: "" } }))).not.toThrow();
		});

		it("rejects locks that request time would reject", () => {
			expect(() => assertStatic(config({ include: { owner: false }, locks: { owner: { mode: "pessimistic_read" } } }))).toThrow('Route relations.request lock "owner" requires a matching enabled include');
			expect(() => assertStatic(config({ include: { owner: true }, locks: { owner: null } }))).toThrow('Route relations.request lock "owner" must be an object');
			expect(() => assertStatic(config({ include: { owner: true }, locks: { owner: { mode: "optimistic" } } }))).toThrow('Route relations.request lock "owner" mode must be pessimistic_read or pessimistic_write');
			expect(() => assertStatic(config({ include: { owner: { profile: true } }, locks: { owner: { mode: "pessimistic_read" } } }))).toThrow('Route relations.request lock "owner" with nested relations requires relationLoadStrategy query');
		});
	});

	describe("assertLoaded", () => {
		let dataSource: DataSource;
		let service: ValidatorOwnerService;

		beforeAll(async () => {
			dataSource = new DataSource({ database: ":memory:", entities: [ValidatorItemEntity, ValidatorOwnerEntity, ValidatorProfileEntity], synchronize: true, type: "better-sqlite3" });
			await dataSource.initialize();
			service = new ValidatorOwnerService(dataSource.getRepository(ValidatorOwnerEntity));
		});

		afterAll(async () => {
			await dataSource.destroy();
		});

		it("accepts nested relations, embedded relations and false values of real relations", () => {
			expect(() => ApiControllerRequestRelationsValidator.assertLoaded({ ownerService: service }, OWNER, config({ include: { owner: { embedded: { profile: true }, profile: false } } }))).not.toThrow();
		});

		it("rejects a nested key that is not a relation, like TypeORM even when it is false", () => {
			expect(() => ApiControllerRequestRelationsValidator.assertLoaded({ ownerService: service }, OWNER, config({ include: { owner: { bogus: true } } }))).toThrow(`Route relations.request key "owner.bogus" is not a relation on ${ValidatorOwnerEntity.name}`);
			expect(() => ApiControllerRequestRelationsValidator.assertLoaded({ ownerService: service }, OWNER, config({ include: { owner: { bogus: false } } }))).toThrow('"owner.bogus"');
		});

		it("walks nested relations and embedded properties", () => {
			expect(() => ApiControllerRequestRelationsValidator.assertLoaded({ ownerService: service }, OWNER, config({ include: { owner: { profile: { bogus: true } } } }))).toThrow(`Route relations.request key "owner.profile.bogus" is not a relation on ${ValidatorProfileEntity.name}`);
			expect(() => ApiControllerRequestRelationsValidator.assertLoaded({ ownerService: service }, OWNER, config({ include: { owner: { embedded: { bogus: true } } } }))).toThrow('Route relations.request key "owner.embedded.bogus"');
		});

		it("uses the overridden service name and skips a disabled include", () => {
			expect(() => ApiControllerRequestRelationsValidator.assertLoaded({ userService: service }, OWNER, config({ include: { owner: true }, services: { owner: "userService" } }))).not.toThrow();
			expect(() => ApiControllerRequestRelationsValidator.assertLoaded({}, OWNER, config({ include: { owner: false } }))).not.toThrow();
		});

		it("rejects a missing service and one that is not an ApiServiceBase", () => {
			expect(() => ApiControllerRequestRelationsValidator.assertLoaded({}, OWNER, config({ include: { owner: true } }))).toThrow('Route relations.request key "owner" needs the service ownerService on the controller');
			expect(() => ApiControllerRequestRelationsValidator.assertLoaded({ ownerService: {} }, OWNER, config({ include: { owner: true } }))).toThrow('Route relations.request key "owner" needs ownerService to be an instance of ApiServiceBase');
		});

		it("leaves nested keys to request time for a service without a repository", () => {
			expect(() => ApiControllerRequestRelationsValidator.assertLoaded({ ownerService: new ValidatorOwnerService(undefined) }, OWNER, config({ include: { owner: { bogus: true } } }))).not.toThrow();
		});
	});

	describe("register", () => {
		it("adds one bootstrap hook per class, runs every check and then the controller hook", async () => {
			const calls: Array<string> = [];

			class Controller {
				public onApplicationBootstrap(): void {
					calls.push("controller");
				}
			}

			const register = (owner: string, include: Record<string, unknown>): void => {
				ApiControllerRequestRelationsValidator.register(Controller.prototype, ValidatorItemEntity as never, owner, config({ include }));
			};

			register("First", { owner: true });
			const hook: unknown = Controller.prototype.onApplicationBootstrap;
			register("Second", { owner: false });

			expect(Controller.prototype.onApplicationBootstrap).toBe(hook);
			await expect(new Controller().onApplicationBootstrap()).rejects.toThrow('First relations.request key "owner" needs the service ownerService');
			expect(calls).toEqual([]);

			Object.assign(Controller.prototype, { ownerService: new ValidatorOwnerService(undefined) });
			await new Controller().onApplicationBootstrap();
			expect(calls).toEqual(["controller"]);
		});

		it("adds no hook without request relations", () => {
			class Controller {}

			ApiControllerRequestRelationsValidator.register(Controller.prototype, ValidatorItemEntity as never, OWNER, undefined);

			expect("onApplicationBootstrap" in Controller.prototype).toBe(false);
		});

		it("rejects a static problem at once", () => {
			class Controller {}

			expect(() => ApiControllerRequestRelationsValidator.register(Controller.prototype, ValidatorItemEntity as never, OWNER, config({ include: { missing: true } }))).toThrow('Route relations.request key "missing" is not a relation');
		});
	});
});
