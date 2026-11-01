import { SWAGGER_METADATA_CONSTANT } from "@constant/swagger";

export const SWAGGER_TEST_METADATA_CONSTANT = Object.freeze({
	...SWAGGER_METADATA_CONSTANT,
	CONSUMES: "swagger/apiConsumes",
	OPERATION: "swagger/apiOperation",
	PRODUCES: "swagger/apiProduces",
	RESPONSE: "swagger/apiResponse",
	SECURITY: "swagger/apiSecurity",
});
