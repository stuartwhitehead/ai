import { Injectable } from "@nestjs/common";
import {
  TextItem,
  TextMarkedContent,
} from "pdfjs-dist/types/src/display/api.js";
import { PdfTextItem, PdfTextMarkedContent, PdfTransform } from "./types.js";
import { PdfElementBoundingBox } from "@ai/types";

@Injectable()
export class PdfMapper {
  // Map PDF.js items to application-owned types so PDF.js types stay internal.
  toPdfItem(from: TextItem): PdfTextItem {
    const transform = this.toTransform(from.transform);
    const boundingBox = this.toBoundingBox(from);
    return { ...from, transform, boundingBox };
  }

  toPdfMarkupItem(from: TextMarkedContent): PdfTextMarkedContent {
    return { ...from };
  }

  toEither(
    from: TextItem | TextMarkedContent,
  ): PdfTextItem | PdfTextMarkedContent {
    // Marked-content entries have an id, ordinary text items do not.
    if ("id" in from) {
      return this.toPdfMarkupItem(from);
    }
    return this.toPdfItem(from);
  }

  // Takes the transform into a more solid type we expect and need to process in toBoundingBox.
  toTransform(transform: any[]): PdfTransform {
    if (transform.length !== 6) {
      throw new Error("Invalid PDF transformation matrix");
    }
    return [
      transform[0],
      transform[1],
      transform[2],
      transform[3],
      transform[4],
      transform[5],
    ];
  }

  toBoundingBox(from: TextItem): PdfElementBoundingBox {
    // Although not all used, I left the extraction values here because they helped me understand
    // the transform contents.  Not the easiest to decipher the first time you look at this stuff.
    const [
      horizontalScale,
      verticalSkew,
      horizontalSkew,
      verticalScale,
      horizontalPosition,
      verticalPosition,
    ] = this.toTransform(from.transform);

    // TODO: this only take into account text that is layed out in the normal horizontal way.  We need
    // to take into account text that runs vertically, at different skews and scales.  A bit of a head
    // ache for another day.
    return {
      x: horizontalPosition,
      y: verticalPosition,
      width: from.width,
      height: from.height,
    };
  }
}
