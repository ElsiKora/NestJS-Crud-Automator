import { ApiSubscriberDiscoveryService } from "@class/api/subscriber/discovery-service.class";
import { Module } from "@nestjs/common";
import { DiscoveryModule } from "@nestjs/core";

/**
 * Module for enabling the subscriber system.
 *
 * Import this module in your application root to enable subscriber discovery.
 * @see {@link https://elsikora.com/docs/nestjs-crud-automator/subscriber-system | Subscriber System}
 */
@Module({
	exports: [ApiSubscriberDiscoveryService],
	imports: [DiscoveryModule],
	providers: [ApiSubscriberDiscoveryService],
})
export class ApiSubscriberModule {}
