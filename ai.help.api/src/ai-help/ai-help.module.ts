import { Module } from "@nestjs/common";
import { AiHelpController } from "./ai-help.controller.js";
import { AiHelpService } from "./ai-help.service.js";
import { AgentService } from "@ai/common";

@Module({
  controllers: [AiHelpController],
  providers: [AiHelpService, AgentService],
})
export class AiHelpModule {}
