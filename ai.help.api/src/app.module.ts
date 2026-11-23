import { Module } from "@nestjs/common";
import { AiHelpModule } from "./ai-help/ai-help.module.js";

@Module({
  imports: [AiHelpModule],
})
export class AppModule {}
