import "reflect-metadata";

import { describeRelationSoftDeleteSuite } from "./relation-reference-soft-delete";

describeRelationSoftDeleteSuite("SQLite", {
	createDataSourceOptions: async () => ({ database: ":memory:", type: "better-sqlite3" }),
	isCursorSupported: false,
});
