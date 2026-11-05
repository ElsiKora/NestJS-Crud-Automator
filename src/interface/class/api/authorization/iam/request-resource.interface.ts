import type { IApiAuthorizationIamResourceSegment } from "@interface/class/api/authorization/iam/resource-segment.interface";

/**
 * The resource string a request names, in the two readings a resource pattern is matched in.
 */
export interface IApiAuthorizationIamRequestResource {
	// Characters each placeholder can render: those its column enforces, and for a placeholder a path value fills, any but a separator of the resource path.
	alphabets: ReadonlyMap<string, RegExp>;
	// Whether a value that fills a placeholder holds a separator of the resource path, so the request names no resource.
	isNamingNoResource: boolean;
	// The reading by the stored row: a placeholder that a path value fills and a filterable column maps stays a placeholder, which the database compares. Absent when no path value fills such a placeholder.
	rowSegments?: ReadonlyArray<IApiAuthorizationIamResourceSegment>;
	// The reading by text: each value the request or a loaded row gives renders as its text.
	segments: ReadonlyArray<IApiAuthorizationIamResourceSegment>;
}
