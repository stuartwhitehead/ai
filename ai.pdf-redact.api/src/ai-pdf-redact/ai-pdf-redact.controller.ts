import {
  BadRequestException,
  Controller,
  NotAcceptableException,
  Post,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Express } from "express";
import { PdfService } from "./pdf/pdf.service.js";
import { PdfPage } from "./pdf/types.js";
import { RedactionService } from "./redaction/redaction.service.js";
import { PdfAnalysisResponse } from "@ai/types";

@Controller("api")
export class AiPdfRedactController {
  constructor(
    private readonly redactionService: RedactionService,
    private readonly pdfService: PdfService,
  ) {}

  // The file is uploaded as multipart form data under "file". Keep it here rather than letting larger
  // payloads get far enough into the application to consume resources unnecessarily.
  @Post("redaction")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
  )
  async redaction(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      // In theory this should never happen.
      throw new BadRequestException("No file uploaded");
    }

    if (file.mimetype !== "application/pdf") {
      // PDF is the only supported format for now. Supporting images would require OCR so text can
      // be extracted and positioned before redaction candidates are matched. That adds processing
      // cost and complexity, and may produce less reliable bounding boxes than native PDF text.
      // TODO: Add OCR for both standalone images and rendered PDF pages, then use one image-based
      // analysis pipeline for both formats. This would also avoid separate handling for PDFs and
      // uploaded images, while relying on the same text extraction and bounding-box mechanism.
      // The bounding box mechanism will definitely be more painful without the PDF element
      // dimensions, although I guess OCR could glean dimensions of elements?
      throw new BadRequestException(
        "Invalid file type. Only PDF files are allowed.",
      );
    }

    // First load the PDF document note the page numbering is 1 based, not 0.
    const pdf = await this.pdfService.extractPdf(file.buffer);

    const pages: PdfPage[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await this.pdfService.extractPage(pdf, pageNumber);
      pages.push(page);
    }

    // Ask the AI-backed redaction service for candidate sensitive values. At this point we still have
    // the PDF text and page structure, so we can match the candidates to exact content items afterward.
    const candidates = await this.redactionService.identify(pages);

    // Convert the model's text candidates into matched PDF items. This gives us the page number and
    // bounding box required for each returned redaction rather than trusting the model's coordinates
    // which can be a bit batty.
    const matches = this.redactionService.matchCandidatesToContent(
      candidates,
      pages,
    );

    // Build the API response from the PDF metadata and matched redactions. Individual text items are
    // left out here = we only need the page dimensions and the bounding boxes to overlay the PDF on
    // the frontend.
    const response: PdfAnalysisResponse = {
      filename: file.originalname,
      pageCount: pdf.numPages,
      // Return page metadata only; the frontend can already use this to prepare the PDF viewer.
      pages: pages.map(({ pageNumber, width, height }) => ({
        pageNumber,
        width,
        height,
      })),
      redactions: matches.map((match) => ({
        text: match.candidate.text,
        category: match.candidate.category,
        // TODO: I dont actually do anything with the confidence score and just show all the overlay
        // bound boxes regardless.  I need to disregard anything lower than say 50% and then use
        // different coloured bound boxes for ranges.  Like 50-70%, yellow redaction boxes and anything
        // greater than 70% red redaction boxes (which is what I apply for all redactions currently).
        confidence: match.candidate.confidence,
        pageNumber: match.pageNumber,
        boundingBoxes: match.contentItems.map((item) => item.boundingBox),
      })),
    };

    return response;
  }
}
