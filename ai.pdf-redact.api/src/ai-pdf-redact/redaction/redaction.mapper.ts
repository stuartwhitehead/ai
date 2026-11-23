import { Injectable } from "@nestjs/common";
import { PdfPage, PdfTextItem } from "../pdf/types.js";

@Injectable()
export class RedactionMapper {
  toDocumentText(pages: PdfPage[]): string {
    // Convert the structured PDF data into readable text before adding it to the prompt. This
    // removes layout and bounding-box details so the AI can focus on identifying sensitive values
    // rather than interpreting PDF document objects, and keeps prompts smaller and easier to inspect.
    // Just throwing across the JSON serialised PDF elements from pdfjsLib just complicates things.
    return pages
      .map((page) => {
        const text = page.content
          .filter((item): item is PdfTextItem => "str" in item)
          .map((item) => item.str + (item.hasEOL ? "\n" : ""))
          .join("");

        return `--- PAGE ${page.pageNumber} ---\n${text}`;
      })
      .join("\n\n");
  }
}
