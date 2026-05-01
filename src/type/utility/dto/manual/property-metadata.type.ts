import type { EManualDtoPropertyMetadataDecorator } from "@enum/utility/dto/manual/property-metadata/decorator.enum";
import type { TApiPropertyBaseProperties, TApiPropertyDateProperties, TApiPropertyEnumProperties, TApiPropertyNumberProperties, TApiPropertyObjectProperties, TApiPropertyStringProperties, TApiPropertyUuidProperties } from "@type/decorator/api/property";

export type TManualDtoPropertyMetadata =
	| {
			apply: PropertyDecorator;
			decorator: EManualDtoPropertyMetadataDecorator.BOOLEAN;
			properties: TApiPropertyBaseProperties;
	  }
	| {
			apply: PropertyDecorator;
			decorator: EManualDtoPropertyMetadataDecorator.DATE;
			properties: TApiPropertyDateProperties;
	  }
	| {
			apply: PropertyDecorator;
			decorator: EManualDtoPropertyMetadataDecorator.ENUM;
			properties: TApiPropertyEnumProperties;
	  }
	| {
			apply: PropertyDecorator;
			decorator: EManualDtoPropertyMetadataDecorator.NUMBER;
			properties: TApiPropertyNumberProperties;
	  }
	| {
			apply: PropertyDecorator;
			decorator: EManualDtoPropertyMetadataDecorator.OBJECT;
			properties: TApiPropertyObjectProperties;
	  }
	| {
			apply: PropertyDecorator;
			decorator: EManualDtoPropertyMetadataDecorator.STRING;
			properties: TApiPropertyStringProperties;
	  }
	| {
			apply: PropertyDecorator;
			decorator: EManualDtoPropertyMetadataDecorator.UUID;
			properties: TApiPropertyUuidProperties;
	  };
