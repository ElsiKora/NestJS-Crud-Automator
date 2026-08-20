import type { IApiControllerGetListQueryPlanOrder, IApiControllerGetListQueryPlanOrderEntry, IApiControllerGetListQueryPlanOrderField } from "@interface/class/api/controller/get-list/query";

/**
 * Resolves the complete stable set of fields whose raw values may participate in a CURSOR order tuple.
 * @param {IApiControllerGetListQueryPlanOrder} order - Compiled GET_LIST order contract.
 * @returns {ReadonlyArray<string>} Frozen, code-unit sorted protected field paths.
 */
export function ApiControllerGetListQueryResolveCursorOrderFields(order: IApiControllerGetListQueryPlanOrder): ReadonlyArray<string> {
	return Object.freeze(
		[
			...new Set<string>([
				...Object.values(order.fields)
					.filter((field: IApiControllerGetListQueryPlanOrderField): boolean => field.isEnabled)
					.map((field: IApiControllerGetListQueryPlanOrderField): string => field.path),
				...(order.defaultOrder ?? []).map((entry: IApiControllerGetListQueryPlanOrderEntry): string => entry.field),
				...(order.tieBreakers ?? []).map((entry: IApiControllerGetListQueryPlanOrderEntry): string => entry.field),
			]),
		].toSorted((left: string, right: string): number => {
			if (left < right) {
				return -1;
			}

			return left > right ? 1 : 0;
		}),
	);
}
