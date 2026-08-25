import type { EApiDtoType, EApiRouteType } from "@enum/index";
import type { CanActivate, Type } from "@nestjs/common";
import type { TApiPropertyDescribeProperties } from "@type/index";

export type TApiPropertyCopyProperties<E> = {
	dtoType?: EApiDtoType;
	entity: (() => Type<E> | undefined) | Type<E>;
	guard?: Type<CanActivate>;
	metadata?: Partial<TApiPropertyDescribeProperties>;
	method?: EApiRouteType;
	propertyName: keyof E;
	shouldAutoResolveContext?: boolean;
};
