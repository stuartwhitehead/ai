<script setup lang="ts">
import { computed, ref } from 'vue';
import ElementContainer from './ElementContainer.vue';
import PdfIcon from '@/icons/PdfIcon.vue';

const props = defineProps<{
  errorMessage?: string | null;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  selected: [value: File];
}>();

const localErrorMessage = ref<string | null>(null);
const displayedErrorMessage = computed(() => localErrorMessage.value ?? props.errorMessage);

function fileSelected(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];

  localErrorMessage.value = null;
  input.value = '';

  if (file == null) {
    localErrorMessage.value = 'You must select a PDF file to upload.';
    return;
  }

  emit('selected', file);
}
</script>
<template>
  <ElementContainer>
    <div class="flex flex-col w-full h-full items-center justify-center">
      <div class="flex flex-col">
        <div class="mb-6 flex justify-center">
          <div
            class="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"
          >
            <PdfIcon class="h-8 w-8" />
          </div>
        </div>

        <h1 class="text-2xl font-semibold tracking-tight text-slate-900">
          AI Redaction Suggestions
        </h1>

        <p class="mt-2 text-sm leading-6 text-slate-500">
          Upload a PDF document to identify potentially sensitive information.
        </p>

        <div class="mt-8" :class="{'pointer-events-none opacity-50': disabled}">
          <label
            for="file-input"
            class="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2 select-none"
          >
            Upload PDF
          </label>

          <input
            id="file-input"
            type="file"
            accept="application/pdf,.pdf"
            class="sr-only"
            @change="fileSelected"
            :disabled="disabled"
          />
        </div>

        <p v-if="displayedErrorMessage" class="mt-4 text-xs text-red-600" role="alert">
          {{ displayedErrorMessage }}
        </p>
        <p v-else class="mt-4 text-xs text-slate-400">PDF files only</p>
      </div>
    </div>
  </ElementContainer>
</template>
