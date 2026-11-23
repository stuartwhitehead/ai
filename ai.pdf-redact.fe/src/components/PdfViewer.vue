<script setup lang="ts">
import * as pdfjsLib from 'pdfjs-dist';
import { nextTick, ref, watch } from 'vue';

import type { PdfAnalysisResponse } from '@ai/types';
import ElementContainer from './ElementContainer.vue';

const props = defineProps<{
  file?: File | null;
  response?: PdfAnalysisResponse | null;
}>();

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const pdfContainer = ref<HTMLDivElement | null>(null);

async function renderPdf(file: File, response: PdfAnalysisResponse) {
  if (!pdfContainer.value) {
    return;
  }

  const container = pdfContainer.value;
  // Remove the previous PDF before loading another file.
  container.innerHTML = '';

  const fileData = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: fileData }).promise;

  // Build all pages in memory first so the container is updated once instead of page by page.
  const fragment = document.createDocumentFragment();

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const originalViewport = page.getViewport({ scale: 1 });
    const availableWidth = container.clientWidth - 32;
    // Scale each page to fit the available width while preserving its proportions.
    const scale = availableWidth / originalViewport.width;

    const viewport = page.getViewport({ scale });
    // Draw a larger backing canvas on sharp screens, while keeping the page the same visible size.
    const outputScale = window.devicePixelRatio || 1;
    const pageWrapper = document.createElement('div');

    pageWrapper.className = 'pdf-page relative shrink-0 bg-white shadow-md';
    pageWrapper.style.width = `${viewport.width}px`;
    pageWrapper.style.height = `${viewport.height}px`;

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
      continue;
    }

    canvas.width = Math.floor(viewport.width * outputScale);
    canvas.height = Math.floor(viewport.height * outputScale);

    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;

    canvas.className = 'block';

    pageWrapper.appendChild(canvas);

    // The overlay sits above the page and contains only the highlight rectangles.
    const overlayLayer = document.createElement('div');

    overlayLayer.className = 'absolute inset-0 pointer-events-none';

    const pageRedactions = response.redactions.filter(
      (redaction) => redaction.pageNumber === pageNumber,
    );

    for (const redaction of pageRedactions) {
      for (const boundingBox of redaction.boundingBoxes) {
        // Convert the PDF's coordinates into browser coordinates, because the two systems
        // use different origins and may use different scales.  This cropped me up to start
        // with and meant the bounding boxes didnt overlay the text on the PDF, they were
        // miles away!
        const points = [
          viewport.convertToViewportPoint(boundingBox.x, boundingBox.y),
          viewport.convertToViewportPoint(boundingBox.x + boundingBox.width, boundingBox.y),
          viewport.convertToViewportPoint(boundingBox.x, boundingBox.y + boundingBox.height),
          viewport.convertToViewportPoint(
            boundingBox.x + boundingBox.width,
            boundingBox.y + boundingBox.height,
          ),
        ];

        const xCoordinates = points.map(([x]) => x);
        const yCoordinates = points.map(([, y]) => y);

        const left = Math.min(...xCoordinates);
        const top = Math.min(...yCoordinates);
        const width = Math.max(...xCoordinates) - left;
        const height = Math.max(...yCoordinates) - top;

        const highlight = document.createElement('div');

        highlight.className = 'absolute rounded-sm border border-red-500 bg-red-400/40';

        highlight.style.left = `${left}px`;
        highlight.style.top = `${top}px`;
        highlight.style.width = `${width}px`;
        highlight.style.height = `${height}px`;

        highlight.title =
          `${redaction.category}: ${redaction.text} ` +
          `(${Math.round(redaction.confidence * 100)}% confidence)`;

        overlayLayer.appendChild(highlight);
      }
    }

    pageWrapper.appendChild(overlayLayer);

    // Render the PDF page before displaying it.
    await page.render({
      canvas,
      canvasContext: context,
      viewport,
      transform: [outputScale, 0, 0, outputScale, 0, 0],
    }).promise;

    fragment.appendChild(pageWrapper);
  }

  container.replaceChildren(fragment);
}

watch(
  () => [props.file, props.response] as const,
  async ([file, response]) => {
    await nextTick();

    // A PDF and its analysis must both exist before the viewer can draw highlights. If either
    // is missing or changed back to empty, clear the old document so stale redactions do not remain.
    if (file && response && pdfContainer.value) {
      await renderPdf(file, response);
    } else if (pdfContainer.value) {
      pdfContainer.value.innerHTML = '';
    }
  },
  { immediate: true },
);
</script>

<template>
  <ElementContainer>
    <div
      ref="pdfContainer"
      class="flex h-full w-full min-h-0 flex-col items-center gap-6 overflow-y-auto px-4 py-6"
    />
  </ElementContainer>
</template>

<style>
@keyframes pdf-fade-in {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

.pdf-page {
  animation: pdf-fade-in 500ms ease-out both;
}
</style>
