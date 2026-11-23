import { z } from "zod";

// The physical representation of a tool offered to the AI model, in this case it doesnt
// accept parameters.  The example I've used in this repo in ai.help.api is requesting
// the time.  Yes you could provide it with a world location etc, but for demonstration
// I kept it really simple.
export type ToolWithoutArguments = {
  description: string;
  json: Record<string, unknown>;
  execute: () => unknown;
};

// The physical representation of a tool offered to the AI model, in this case accepting
// parameters.  Note the requirement for the Zod schema and Zod parameter JSON definitions.
// These are required because when we map the physical tool definition here to the options
// structure the AI model call wants, we also provide the schemas and set the strict option
// to true, so the AI must strictly adhere to the parameter schema.  They are also required
// by my tool execution mechanism to validate the arguments provided by AI before making
// the actual required function call - dont trust anything from this damned thing.
export type ToolWithArguments<T extends z.ZodType> = {
  description: string;
  schema: T;
  json: Record<string, unknown>;
  execute(args: z.infer<T>): unknown;
};

// The way I define the physical functions that will be available as tool calls to the AI
// model.
export type ToolRegistry = Record<
  string,
  ToolWithoutArguments | ToolWithArguments<z.ZodType<unknown>>
>;
