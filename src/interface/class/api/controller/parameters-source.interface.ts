import type { IApiEntity } from "@interface/entity";
import type { TApiPropertyDescribeProperties } from "@type/decorator/api/property";

export interface IApiControllerParametersSource {
	entityMetadata: IApiEntity<unknown>;
	metadata: TApiPropertyDescribeProperties;
}
