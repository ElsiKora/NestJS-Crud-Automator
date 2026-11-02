import type { DeepPartial, EntityManager, Repository } from "typeorm";

import type { IApiBaseEntity, TApiControllerGetListQuery, TApiControllerMethodMap, TApiEntityReference, TApiPropertyEntity } from "../../../../src";

import { ApiAuthorizationPolicyBase, EFilterOperation } from "../../../../src";
import { describe, expect, it } from "vitest";

interface IInterfaceEntity extends IApiBaseEntity {
	count: number;
	description: string;
	id: string;
}

interface IPlainEntity {
	count: number;
	description: string;
	id: string;
}

class ImplementingEntity implements IApiBaseEntity {
	public count!: number;

	public description!: string;

	public id!: string;
}

abstract class AbstractEntity implements IApiBaseEntity {
	public id!: string;
}

type TTypeEqual<L, R> = (<T>() => T extends L ? 1 : 2) extends <T>() => T extends R ? 1 : 2 ? true : false;

const HEADERS: Record<string, string> = {};
const IP_ADDRESS: string = "127.0.0.1";

/**
 * Calls the generated methods of an entity that extends the base type.
 * @param {TApiControllerMethodMap<IInterfaceEntity>} controller Generated controller methods.
 * @returns {ReadonlyArray<unknown>} Never read; the function only has to compile.
 */
function callInterfaceEntityRoutes(controller: TApiControllerMethodMap<IInterfaceEntity>): ReadonlyArray<unknown> {
	return [
		controller.getList({ limit: 10, page: 1 }, HEADERS, IP_ADDRESS),
		controller.getList({ description: { operator: EFilterOperation.EQ, value: "text" }, limit: 10, orderBy: "count", page: 1 }, HEADERS, IP_ADDRESS),
		controller.create({ description: "text" }, HEADERS, IP_ADDRESS),
		// @ts-expect-error The entity has no such column
		controller.getList({ limit: 10, notAColumn: { operator: EFilterOperation.EQ, value: "text" }, page: 1 }, HEADERS, IP_ADDRESS),
		// @ts-expect-error The filter value has the column's type
		controller.getList({ description: { operator: EFilterOperation.EQ, value: 1 }, limit: 10, page: 1 }, HEADERS, IP_ADDRESS),
		// @ts-expect-error The entity has no such column
		controller.getList({ limit: 10, orderBy: "notAColumn", page: 1 }, HEADERS, IP_ADDRESS),
		// @ts-expect-error The entity has no such column
		controller.create({ notAColumn: 1 }, HEADERS, IP_ADDRESS),
	];
}

/**
 * Writes an entity that extends the base type through TypeORM.
 * @param {EntityManager} manager Entity manager.
 * @param {Repository<IInterfaceEntity>} repository Repository.
 * @returns {ReadonlyArray<unknown>} Never read; the function only has to compile.
 */
function updateInterfaceEntity(manager: EntityManager, repository: Repository<IInterfaceEntity>): ReadonlyArray<unknown> {
	return [
		manager.update<IInterfaceEntity>("interface_entity", { id: "id" }, { description: "text" }),
		repository.update({ id: "id" }, { description: "text" }),
		repository.findOneBy({ id: "id" }),
		// @ts-expect-error The entity has no such column
		repository.update({ id: "id" }, { notAColumn: 1 }),
	];
}

/**
 * Reads the keys of an entity that extends the base type.
 * @param {IInterfaceEntity} entity Entity.
 * @returns {ReadonlyArray<unknown>} Never read; the function only has to compile.
 */
function readInterfaceEntity(entity: IInterfaceEntity): ReadonlyArray<unknown> {
	return [
		entity.description,
		// @ts-expect-error The entity has no such key
		entity.notAColumn,
	];
}

/**
 * Scopes rows to an owner key of an entity that extends the base type.
 */
abstract class OwnedEntityPolicy extends ApiAuthorizationPolicyBase<IInterfaceEntity> {
	protected scopes(): ReadonlyArray<unknown> {
		return [
			this.scopeToOwner(),
			this.scopeToOwner("id"),
			// @ts-expect-error The entity has no such key
			this.scopeToOwner("notAColumn"),
		];
	}
}

/**
 * Uses the other accepted entity shapes the same way.
 * @param {TApiControllerMethodMap<ImplementingEntity>} implementing Methods of a class implementing the base type.
 * @param {TApiControllerMethodMap<IPlainEntity>} plain Methods of an interface that does not extend it.
 * @param {Repository<ImplementingEntity>} repository Repository of the class.
 * @returns {ReadonlyArray<unknown>} Never read; the function only has to compile.
 */
function useOtherEntityShapes(implementing: TApiControllerMethodMap<ImplementingEntity>, plain: TApiControllerMethodMap<IPlainEntity>, repository: Repository<ImplementingEntity>): ReadonlyArray<unknown> {
	return [implementing.getList({ limit: 10, page: 1 }, HEADERS, IP_ADDRESS), plain.getList({ limit: 10, page: 1 }, HEADERS, IP_ADDRESS), repository.update({ id: "id" }, { description: "text" })];
}

/**
 * Uses a generic entity the way application base classes do.
 * @template E - Entity type.
 * @param {EntityManager} manager Entity manager.
 * @param {new () => E} target Entity class.
 * @param {Repository<E>} repository Repository.
 * @param {TApiControllerMethodMap<E>} controller Generated controller methods.
 * @param {DeepPartial<E>} body Create body.
 * @returns {ReadonlyArray<unknown>} Never read; the function only has to compile.
 */
function useGenericEntity<E extends IApiBaseEntity>(manager: EntityManager, target: new () => E, repository: Repository<E>, controller: TApiControllerMethodMap<E>, body: DeepPartial<E>): ReadonlyArray<unknown> {
	return [manager.getRepository(target), repository.create(body), controller.create(body, HEADERS, IP_ADDRESS)];
}

describe("IApiBaseEntity", () => {
	it("adds no keys to an entity that extends it", () => {
		const keys: TTypeEqual<keyof IInterfaceEntity, "count" | "description" | "id"> = true;
		const query: TApiControllerGetListQuery<IInterfaceEntity> = { limit: 10, page: 1 };

		expect(keys).toBe(true);
		expect(query).toEqual({ limit: 10, page: 1 });
	});

	it("rejects a value that is not an object as an entity", () => {
		// @ts-expect-error An entity is an object
		const entity: IApiBaseEntity = "entity";

		expect(entity).toBe("entity");
	});

	it("takes a class, an abstract class or a named object as an entity reference", () => {
		const references: ReadonlyArray<TApiEntityReference> = [ImplementingEntity, AbstractEntity, { name: "Named" }];

		expect(references).toHaveLength(3);
	});

	it("cannot refuse an empty object, an object-typed value or a function as an entity reference", () => {
		const objectValue: object = {};
		const references: ReadonlyArray<TApiEntityReference> = [{}, objectValue, Object.create(null) as object, (): void => {}];

		expect(references).toHaveLength(4);
	});

	it("refuses other values as an entity reference", () => {
		// @ts-expect-error An object with other keys has no name in common with a reference
		const otherKeys: TApiEntityReference = { tableName: "named" };
		// @ts-expect-error A name is a string
		const numericName: TApiEntityReference = { name: 1 };
		// @ts-expect-error A string is not an object
		const text: TApiEntityReference = "named";
		// @ts-expect-error null is not an object
		const nullValue: TApiEntityReference = null;
		// @ts-expect-error An array has no name in common with a reference
		const array: TApiEntityReference = [];
		// @ts-expect-error An instance of a class without a name has no name in common with a reference
		const instance: TApiEntityReference = new ImplementingEntity();

		expect([otherKeys, numericName, text, nullValue, array, instance]).toHaveLength(6);
	});

	it("takes the same references in a property decorator's entity option", () => {
		const entities: ReadonlyArray<TApiPropertyEntity> = [ImplementingEntity, AbstractEntity, { name: "Named" }, () => ImplementingEntity, () => undefined];

		// @ts-expect-error An object with other keys has no name in common with an entity option
		const wrongEntity: TApiPropertyEntity = { tableName: "named" };

		expect(entities).toHaveLength(5);
		expect(wrongEntity).toEqual({ tableName: "named" });
	});

	it("keeps the compile checks referenced", () => {
		expect([callInterfaceEntityRoutes, OwnedEntityPolicy, readInterfaceEntity, updateInterfaceEntity, useOtherEntityShapes, useGenericEntity].every((check: unknown) => typeof check === "function")).toBe(true);
	});
});
