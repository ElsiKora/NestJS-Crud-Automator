export interface IApiControllerSchemaNameController {
	// Controller class registered in the application.
	controller: abstract new (...arguments_: Array<never>) => unknown;
	// Name of the module that registers the controller; it tells two classes with one name apart in errors.
	moduleName?: string;
}
