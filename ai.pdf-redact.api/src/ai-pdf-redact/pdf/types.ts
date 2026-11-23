import { PdfElementBoundingBox } from "@ai/types";

export type PdfTransform = [number, number, number, number, number, number];

export type PdfTextItem = {
  str: string;
  dir: string;
  transform: PdfTransform;
  width: number;
  height: number;
  fontName: string;
  hasEOL: boolean;
  boundingBox: PdfElementBoundingBox;
};

export type PdfTextMarkedContent = {
  id: string;
  type: string;
};

export type PdfPage = {
  pageNumber: number;
  width: number;
  height: number;
  content: (PdfTextItem | PdfTextMarkedContent)[];
};
