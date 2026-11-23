import { Module } from "@nestjs/common";
import { RedactionService } from "./redaction.service.js";
import { RedactionMapper } from "./redaction.mapper.js";
import { AgentService } from "@ai/common";

@Module({
  providers: [RedactionMapper, AgentService, RedactionService],
})
export class RedactionModule {}
