import { z } from "zod";
import { redactionCategories } from "@ai/types";

export const RedactionCandidateSchema = z.object({
  text: z.string().min(1),
  category: z.enum(redactionCategories),
  confidence: z.number().min(0).max(1),
});

export const RedactionResponseSchema = z.object({
  candidates: z.array(RedactionCandidateSchema),
});

export type RedactionCandidate = z.infer<typeof RedactionCandidateSchema>;

export type RedactionResponse = z.infer<typeof RedactionResponseSchema>;
