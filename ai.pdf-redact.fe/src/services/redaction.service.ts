import { api } from './api';
import type { PdfAnalysisResponse } from '@ai/types';

export const redactionService = {
  async analyse(file: File): Promise<PdfAnalysisResponse> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<PdfAnalysisResponse>('api/redaction', formData);
    return response.data;
  },
};
