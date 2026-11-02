import type { AsyncLocalStorage } from "node:async_hooks";

import type { IApiControllerGeneratedInsertedKeyEntry } from "@interface/class/api/controller/generated/inserted-key-entry.interface";
import type { ObjectLiteral } from "typeorm";

import { AsyncLocalStorage as NodeAsyncLocalStorage } from "node:async_hooks";

import { ApiControllerGeneratedSecuritySnapshot } from "@class/api/controller/generated/security-snapshot.class";
import { ErrorException } from "@utility/error/exception.utility";

/**
 * Carries the key of the row a generated CREATE route inserted from the built-in create function back to the route.
 * The create function that receives the route's own body claims the entry, and reports the key TypeORM saved before any function subscriber can replace the result.
 */
export class ApiControllerGeneratedInsertedKeyStorage {
	private static readonly STORAGE: AsyncLocalStorage<IApiControllerGeneratedInsertedKeyEntry> = new NodeAsyncLocalStorage<IApiControllerGeneratedInsertedKeyEntry>();

	/**
	 * Claims the entry of the route that called the create function with this body.
	 * @param {object} input - Body the create function received.
	 * @returns {((key: ObjectLiteral | undefined) => void) | undefined} Reporter of the inserted key, or undefined when no generated route waits for this call.
	 */
	public static claim(input: object): ((key: ObjectLiteral | undefined) => void) | undefined {
		const entry: IApiControllerGeneratedInsertedKeyEntry | undefined = this.STORAGE.getStore();

		if (entry?.input !== input || entry.isClaimed) {
			return undefined;
		}

		entry.isClaimed = true;

		return (key: ObjectLiteral | undefined): void => {
			entry.key = key ? ApiControllerGeneratedSecuritySnapshot.detach(key) : undefined;
		};
	}

	/**
	 * Runs a create call and returns the key of the row it inserted.
	 * @param {object} input - Body the route passes to the create function.
	 * @param {() => Promise<unknown>} callback - The create call.
	 * @returns {Promise<ObjectLiteral>} Key of the inserted row.
	 * @throws {Error} When the create function did not report the key of the row it inserted.
	 */
	public static async run(input: object, callback: () => Promise<unknown>): Promise<ObjectLiteral> {
		const entry: IApiControllerGeneratedInsertedKeyEntry = { input, isClaimed: false };

		return await this.STORAGE.run(entry, async (): Promise<ObjectLiteral> => {
			await callback();

			if (!entry.key) {
				throw ErrorException("Generated CREATE function did not report the key of the row it inserted");
			}

			return entry.key;
		});
	}
}
