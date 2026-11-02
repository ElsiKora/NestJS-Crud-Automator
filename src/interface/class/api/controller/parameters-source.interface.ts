import type { IApiEntity, IApiEntityColumn } from "@interface/entity";
import type { TApiPropertyDescribeProperties } from "@type/decorator/api/property";

export interface IApiControllerParametersSource {
	column: IApiEntityColumn<unknown>;
	entityMetadata: IApiEntity<unknown>;
	metadata: TApiPropertyDescribeProperties;
}
