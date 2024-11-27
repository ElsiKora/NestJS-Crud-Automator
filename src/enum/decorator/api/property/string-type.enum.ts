import { EApiPropertyDataType } from "./data-type.enum";

export enum EApiPropertyStringType {
	DATE = EApiPropertyDataType.DATE,
	EMAIL = EApiPropertyDataType.EMAIL,
	IP = EApiPropertyDataType.IP,
	LOWERCASE_STRING = EApiPropertyDataType.LOWERCASE_STRING,
	REGEXP = EApiPropertyDataType.REGEXP,
	STRING = EApiPropertyDataType.STRING,
	UPPERCASE_STRING = EApiPropertyDataType.UPPERCASE_STRING,
	URL = EApiPropertyDataType.URL,
	UUID = EApiPropertyDataType.UUID,
}
