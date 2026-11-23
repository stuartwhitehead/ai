import { z } from "zod";
import type { ToolRegistry } from "@ai/common";

// Everything in this file ultimately results in the tools offered to Open AI when we make a request
// in this AI Help API.

const getCurrentTimeSchema = z.object({});

// Critical, Zod (kneel before me supermaaaaaaaaaaan) schema for the arguments for the generation of
// random numbers function/tool.  This schema is also used to vaidate any parameters the AI model
// provides us when requesting a call to get_random_number.  Trust nothing it provides us.
const getRandomNumberSchema = z.object({
  min: z.number().nullable(),
  max: z.number().nullable(),
});

function getCurrentTime(): string {
  // About as Mickey Mouse Clubhouse as it gets.
  return new Date().toISOString();
}

function getRandomNumber(min: number, max: number): number {
  // Simples, generates a random number between X and Y.
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// The tool calls we offer to Open AI when we make a request from this API.
export const helpTools = {
  get_current_time: {
    description: "Gets the current date and time from the application.",
    schema: getCurrentTimeSchema,
    json: z.toJSONSchema(getCurrentTimeSchema),
    execute: () => getCurrentTime(),
  },
  get_random_number: {
    description: "Generates a random number within the specified range.",
    schema: getRandomNumberSchema,
    json: z.toJSONSchema(getRandomNumberSchema),
    execute: (args: z.infer<typeof getRandomNumberSchema>) =>
      getRandomNumber(args.min ?? 0, args.max ?? 100),
  },
} satisfies ToolRegistry;
