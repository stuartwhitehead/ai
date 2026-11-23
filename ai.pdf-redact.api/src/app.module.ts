import { Module } from "@nestjs/common";
import { AiPdfRedactModule } from "./ai-pdf-redact/ai-pdf-redact.module.js";
import { PdfModule } from "./ai-pdf-redact/pdf/pdf.module.js";
import { RedactionModule } from "./ai-pdf-redact/redaction/redaction.module.js";

@Module({
  imports: [PdfModule, RedactionModule, AiPdfRedactModule],
})
export class AppModule {}
