import { Injectable } from "@nestjs/common";
import { PdfPage, PdfTextItem } from "../pdf/types.js";
import {
  RedactionCandidate,
  RedactionResponseSchema,
} from "./redaction.schema.js";
import { RedactionMapper } from "./redaction.mapper.js";
import { AgentService } from "@ai/common";
import { zodTextFormat } from "openai/helpers/zod";
import { isPdfTextItem } from "../pdf/utils.js";
import { redactionCategories } from "@ai/types";

@Injectable()
export class RedactionService {
  constructor(
    private readonly mapper: RedactionMapper,
    private readonly agent: AgentService,
  ) {}

  // Ask the AI for sensitive values and receive only validated candidates. The returned text must
  // match text already present in the PDF, while the category and confidence keep the result structured.
  async identify(pages: PdfPage[]): Promise<RedactionCandidate[]> {
    // I dont just JSON serialise the PDF elements, its much better to translate it to a simple text
    // representation of the PDF, AI doesnt get lot in the details.
    const documentText = this.mapper.toDocumentText(pages);

    // Note the categories are the true TS union type and keeps the relationship solid.
    const question = `
      Identify all potential sensitive information in the following PDF.

      Return each distinct value with:
      - text: the exact text found in the document
      - category: one of ${redactionCategories.join(", ")}
      - confidence: a number between 0 and 1

      Document:
      ${documentText}
      `;

    // These instructions limit the AI to information actually in the document. They also tell it
    // not to guess or invent values that are not present.  I give is a solid set of examples about
    // the type of data we would like to redact.
    //
    // TODO: It seems to perform well across the board, but phone numbers can sometimes be tricky
    // and I've found monetary values sometimes get flagged as phone numbers!  I think a good
    // approach here would be to manually vet the text values using a REGEX and tag values I
    // believe are really phone numbers and then expand the prompt below to ignore all numerical
    // values apart from those tagged with <PHONE NUMBER> and for AI to redact those explicitly.
    const prompt = `
      You are a sensitive information detection assistant.

      Identify names, addresses, email addresses and phone numbers.
      Only identify information explicitly present in the supplied document.
      Do not invent or infer missing information.
      Return the results in the requested structured format.
      `;

    // Zod provides a response format that tells the AI the expected shape: a candidates array,
    // where each item has text, category, and confidence fields.  This requirement is strict
    // and stops AI returning us cobblers.
    const responseFormat = zodTextFormat(
      RedactionResponseSchema,
      "redaction_response",
    );

    // Execute the prompt and get the response back, we need to check that response format, could
    // be any old thing.  In theory, the response format above should ensure what we get back.
    const result = await this.agent.run(question, prompt, { responseFormat });

    // Parse the JSON first, then validate it against the Zod schema. Is it cobblers?
    const parsed = RedactionResponseSchema.parse(JSON.parse(result));

    return parsed.candidates;
  }

  // Find every PDF text item that belongs to an AI candidate. This step replaces AI-generated
  // coordinates with locations measured from the original PDF, so the returned boxes are grounded
  // in the actual document content.  Essentially, marrying up the redactions the AI has suggested
  // with the real PDF elements. This is the only painful side-effect of converting to text for
  // the prompt.  TODO: we could make this more efficient, quite easily with dictionary lookups.
  matchCandidatesToContent(
    candidates: RedactionCandidate[],
    pages: PdfPage[],
  ): {
    candidate: RedactionCandidate;
    pageNumber: number;
    contentItems: PdfTextItem[];
  }[] {
    const matches = [];

    for (const candidate of candidates) {
      for (const page of pages) {
        // Ignore marked-content entries and keep only text pieces because only those have
        // the words and positions needed to draw a redaction box.
        const items = page.content.filter(isPdfTextItem);

        // Rebuild the text in reading order, including line breaks, so it is in the same
        // general form that was sent to the AI.
        const pageText = items
          .map((item) => item.str + (item.hasEOL ? "\n" : ""))
          .join("");

        let searchIndex = 0;

        while (true) {
          // Find repeated matches as well as the first match. Searching from after the previous
          // match allows the same candidate text to be found more than once on a page.
          const index = pageText.indexOf(candidate.text, searchIndex);

          if (index === -1) {
            break;
          }

          const endIndex = index + candidate.text.length;

          let currentPosition = 0;
          const contentItems: PdfTextItem[] = [];

          // PDF text is often split across many small pieces, painfully. Include every piece that overlaps
          // the candidate's character range, even when the same candidate spans several damned pieces.
          for (const item of items) {
            const itemStart = currentPosition;
            const itemEnd = itemStart + item.str.length;

            if (itemStart < endIndex && itemEnd > index) {
              contentItems.push(item);
            }

            currentPosition = itemEnd + (item.hasEOL ? 1 : 0);
          }

          matches.push({
            candidate,
            pageNumber: page.pageNumber,
            contentItems,
          });

          searchIndex = index + candidate.text.length;
        }
      }
    }

    return matches;
  }
}
