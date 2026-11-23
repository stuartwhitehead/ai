<script setup lang="ts">
import FileUpload from '@/components/FileUpload.vue';
import PdfViewer from '@/components/PdfViewer.vue';
import { redactionService } from '@/services/redaction.service';
import type { PdfAnalysisResponse } from '@ai/types';
import { ref } from 'vue';

const busy = ref(false);
const errorMessage = ref<string | null>(null);

const selectedFile = ref<File | null>();
const response = ref<PdfAnalysisResponse | null>();

function reset() {
  errorMessage.value = null;
  selectedFile.value = null;
  response.value = null;
}

async function fileSelected(file: File) {
  try {
    reset();
    busy.value = true;
    selectedFile.value = file;
    response.value = await redactionService.analyse(file);
  } catch (error) {
    console.error('Failed to analyze PDF:', error);
    errorMessage.value = "We couldn't analyze this PDF. Please try again.";
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="flex flex-col h-full w-full lg:flex-row">
    <FileUpload :error-message="errorMessage" @selected="fileSelected" :disabled="busy" />
    <PdfViewer :file="selectedFile" :response="response" />
  </div>
</template>
