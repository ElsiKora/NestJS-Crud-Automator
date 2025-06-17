import { Module } from "@nestjs/common";
import { DiscoveryModule } from "@nestjs/core";
import { ApiSubscriberDiscoveryService } from "@class/api/subscriber/discovery-service.class";

@Module({
    imports: [DiscoveryModule],
    providers: [ApiSubscriberDiscoveryService],
    exports: [ApiSubscriberDiscoveryService]
})
export class ApiSubscriberModule {} 