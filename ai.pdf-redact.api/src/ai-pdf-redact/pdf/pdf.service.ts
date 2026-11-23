import { BadRequestException, Injectable } from "@nestjs/common";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { PDFDocumentProxy } from "pdfjs-dist/types/src/display/api.js";
import { PdfPage, PdfTextItem, PdfTextMarkedContent } from "./types.js";
import { PdfMapper } from "./pdf.mapper.js";

@Injectable()
export class PdfService {
  constructor(private readonly mapper: PdfMapper) {}

  async extractPdf(buffer: Buffer): Promise<PDFDocumentProxy> {
    // PDF.js works with a byte array, so copy the uploaded file's bytes into the format it expects.
    return await pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
    }).promise;
  }

  /**
   * Reads one page and turns it into the app's page format, including its size and text content.
   */
  async extractPage(
    pdf: PDFDocumentProxy,
    pageNumber: number,
  ): Promise<PdfPage> {
    if (pageNumber < 1 || pageNumber > pdf.numPages) {
      throw new BadRequestException(`Page ${pageNumber} does not exist!`);
    }

    const page = await pdf.getPage(pageNumber);
    // A scale of 1 keeps page dimensions in PDF.js points. The app uses these dimensions for layout
    // and for interpreting text bounding boxes for overlaying the PDF on the frontend.
    const viewport = page.getViewport({ scale: 1 });
    const text = await page.getTextContent();
    // Convert PDF.js text and marked-content entries into the app's simpler page data types.
    const content = text.items.map((i) => this.mapper.toEither(i));

    // The reason I return my own type here is to keep the pdfjsLib from leaking outside if this
    // service.  Plus, I dont need half of the information it provides me.
    return {
      pageNumber,
      content,
      width: viewport.width,
      height: viewport.height,
    };
  }
}
