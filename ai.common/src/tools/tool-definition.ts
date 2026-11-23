import type { Tool } from "openai/resources/responses/responses.js";
import type { ToolRegistry } from "./tool.types.js";

// Simply maps our locally defined tool call functions into the definition of those tools required for
// the AI model. One thing I learned and to note is that the AI model does not actually make the tool
// call, your own API does.  It simply instructs when it would like to call an available tool you provided
// it with at which point you validate its existence and the parameters the model provides you with. You
// need to scrutanise the request to the max, specially the parameters against the Zod schemas you defined.
export function createToolDefinitions(registry: ToolRegistry): Tool[] {
  return Object.entries(registry).map(([name, definition]) => ({
    // Always function, since thats all we want to offer.
    type: "function",
    // The function name, Ive tried my best to bind this using TypeScript to the actual function names
    // themselves, rather than simply using "strings".  This generic approach then allows me to make tool
    // calls using the "name" as the real function signature which keeps it clean and also helps me to
    // easily check if the tool exists (against the tool registry dictionary).
    name,
    // Describes to the AI model what this function is for, very important since the context helps it know
    // when to actually require the toolcall based on the incoming prompt and question.
    description: definition.description,
    // Critical, the Zod JSON definition of the acceptable parameters types and values for this function.
    parameters: definition.json,
    // Critical, means we do not accept baggy parameters and anything it gives us when requesting a tool
    // call must strictly conform to the Zod parameter definitions above.
    strict: true,
  }));
}
