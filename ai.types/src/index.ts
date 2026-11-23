// Categories AI is requested to respond with if it reads text it believes should be
// redacted.  This same array of values is used in the AI prompt for the PDF redaction
// calls to Open AI itself (e.g. part of its behaviour and responses guide).
export const redactionCategories = [
  "name",
  "address",
  "email",
  "phone-number",
] as const;

export type RedactionCategory = (typeof redactionCategories)[number];

// Represents a rectangular shapes position and size to annotate over the PDF to indicate
// text the AI suggested should be redacted based on the union type above.
export type PdfElementBoundingBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

// Represents text from a PDF AI has flagged as being needed to be redacted.  Currently
// we dont take into account confidence, but should.  TODO: maybe display bounding boxes
// with different colours - like RED if confidence > 0.9, YELLOW if >= 0.5 && <= 0.9 etc.
// That way we can indicate just with a bit of colour how important/accurately matched that
// redaction is.
export type PdfRedaction = {
  text: string;
  category: RedactionCategory;
  confidence: number;
  pageNumber: number;
  boundingBoxes: PdfElementBoundingBox[];
};

// Represents the entire result of analysing a whole uploaded PDF, the most important parts
// being the redactions, if any.
export type PdfAnalysisResponse = {
  filename: string;
  pageCount: number;
  pages: {
    pageNumber: number;
    width: number;
    height: number;
  }[];
  redactions: PdfRedaction[];
};
