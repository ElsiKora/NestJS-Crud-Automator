import type { IApiControllerTableInheritanceVariant } from "@interface/class/api/controller/table-inheritance/variant.interface";
import type { Type } from "@nestjs/common";

export interface IApiControllerTableInheritancePlan {
	childEntities: ReadonlyArray<Type<unknown>>;
	discriminatorPropertyName: string;
	rootEntity: Type<unknown>;
	variants: ReadonlyArray<IApiControllerTableInheritanceVariant>;
}
