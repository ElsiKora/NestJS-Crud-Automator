import { ApiSubscriberDiscoveryService } from "@class/api/subscriber/discovery-service.class";
import { Module } from "@nestjs/common";
import { DiscoveryModule } from "@nestjs/core";

@Module({
	exports: [ApiSubscriberDiscoveryService],
	imports: [DiscoveryModule],
	providers: [ApiSubscriberDiscoveryService],
})
export class ApiSubscriberModule {}
