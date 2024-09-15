import type { IApiEntity } from "./entity";
import type { TApiPropertyDescribeDtoProperties, TApiPropertyDescribeProperties } from "../type";

export interface IDtoGenerateFactory {
	create(metadata: TApiPropertyDescribeProperties, entity: IApiEntity, config: TApiPropertyDescribeDtoProperties): PropertyDecorator;
}
