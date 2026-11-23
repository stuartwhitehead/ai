import { Module } from "@nestjs/common";
import { PdfService } from "./pdf.service.js";
import { PdfMapper } from "./pdf.mapper.js";

@Module({
  providers: [PdfMapper, PdfService],
})
export class PdfModule {}
