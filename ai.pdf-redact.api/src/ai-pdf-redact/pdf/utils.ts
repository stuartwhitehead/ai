import { PdfTextItem, PdfTextMarkedContent } from "./types.js";

// Simple TS duck type sniffing, returns true only if the item is a PdfTextItem.
export function isPdfTextItem(
  item: PdfTextItem | PdfTextMarkedContent,
): item is PdfTextItem {
  return "str" in item;
}
