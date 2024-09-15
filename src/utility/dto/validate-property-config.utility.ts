import { ErrorException } from "../error-exception.utility";

import type { TApiPropertyDescribeDtoProperties } from "../../type";

export const DtoValidatePropertyConfig = (config: TApiPropertyDescribeDtoProperties, propertyName: string): void => {
	if (config.response && config.required !== undefined) {
		throw ErrorException(`Invalid config for ${propertyName}: 'required' should not be set when 'response' is true`);
	}

	if (config.expose && !config.response) {
		throw ErrorException(`Invalid config for ${propertyName}: 'expose' can only be true when 'response' is true`);
	}
};
