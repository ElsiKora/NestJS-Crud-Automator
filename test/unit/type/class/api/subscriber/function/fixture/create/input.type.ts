export type TSubscriberResultCreateInput = {
	readonly amount: string;
	readonly currency: {
		readonly id: string;
	};
	readonly destination: string;
	readonly ipAddress: null | string;
	readonly payWayProvider: {
		readonly id: string;
	};
	readonly user: {
		readonly id: string;
	};
	readonly userAgent: null | string;
};
