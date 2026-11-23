import { Module } from "@nestjs/common";
import { AiPdfRedactController } from "./ai-pdf-redact.controller.js";
import { AgentService } from "@ai/common";
import { PdfService } from "./pdf/pdf.service.js";
import { PdfMapper } from "./pdf/pdf.mapper.js";
import { RedactionService } from "./redaction/redaction.service.js";
import { RedactionMapper } from "./redaction/redaction.mapper.js";

@Module({
  controllers: [AiPdfRedactController],
  providers: [
    PdfMapper,
    PdfService,
    RedactionMapper,
    RedactionService,
    AgentService,
  ],
})
export class AiPdfRedactModule {}
