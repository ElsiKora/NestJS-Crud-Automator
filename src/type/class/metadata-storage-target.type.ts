/**
 * Class whose property metadata MetadataStorage keeps. The constructor itself is the key, so classes that share a name never share metadata.
 */
export type TMetadataStorageTarget = abstract new (...arguments_: Array<never>) => unknown;
