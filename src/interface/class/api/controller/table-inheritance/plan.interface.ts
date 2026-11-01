import type { IApiControllerTableInheritanceVariant } from "@interface/class/api/controller/table-inheritance/variant.interface";

export interface IApiControllerTableInheritancePlan {
	// eslint-disable-next-line @elsikora/typescript/no-unsafe-function-type
	childEntities: ReadonlyArray<Function>;
	discriminatorPropertyName: string;
	// eslint-disable-next-line @elsikora/typescript/no-unsafe-function-type
	rootEntity: Function;
	variants: ReadonlyArray<IApiControllerTableInheritanceVariant>;
}
