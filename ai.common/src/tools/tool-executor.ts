import { z } from "zod";
import {
  ToolRegistry,
  ToolWithArguments,
  ToolWithoutArguments,
} from "./tool.types.js";

// When we define a physical tool it can be one that accepts arguments and one that doesnt.
// If arguments are required then you have to provide the Zod schema and JSON definitions
// for those parameters, that then get nicely types when you define the execute function.
type ToolDefinition = ToolWithoutArguments | ToolWithArguments<z.ZodType>;

/**
 * Simply calls execute on the tool requested by AI.  The most important point is that we
 * use the defined Zod schema to validate the arguments provided to us from the AI model.
 * You do not just blindly trust the AI model, even with strict set to true on the tool
 * definitions we provided the model with.
 *
 * @param {ToolDefinition} tool to execute.
 * @param {string} rawArgs from the AI model, JSON format.
 * @return result.
 */
function executeTool(tool: ToolDefinition, rawArgs: string): unknown {
  if (!("schema" in tool)) {
    // Parameterless tool call.
    return tool.execute();
  }

  const args = JSON.parse(rawArgs || "{}");
  // This will throw a ZodError (come to me Supermaaaaaaaaan) error if not valid.
  const validatedArgs = tool.schema.parse(args);

  // Make the tool call with the parameters that the AI model provided us with.
  return tool.execute(validatedArgs);
}

/**
 * Checks to see if we have a matching tool and attempts to execute it.
 *
 * @export
 * @template T
 * @param {T} registry, the physical function definitions on offer to the ai model.
 * @param {string} name, the name of the tool/function to execute.  These are tied to the real
 * function names, note "name as keyof T" which means the way we define the functions available
 * as tool calls and the tool definitions fed to the AI model are one and the same, not just
 * "strings".  If you rename a function that is available as a tool call, the break is highlighted
 * all over because of the typing.
 * @param {string} rawArgs, the parameters provided by the AI model in JSON format.
 * @return result.
 */
export function executeRegisteredTool<T extends ToolRegistry>(
  registry: T,
  name: string,
  rawArgs: string,
): unknown {
  // Quick lookup, does the tool exist (e.g. is it a known defined function name)?
  const tool = registry[name as keyof T];

  if (!tool) {
    // AI model has been naughty!  Made up some tool call name!  To be honest, I have never seen this
    // happen yet.  But its a critical guard, just like how we validate the AI tool call
    // parameters against the Zod parameter schema before executing above in executeTool.
    throw new Error(`Tool ${name} is not available.`);
  }

  // Exists, so we make a request to have it execute.
  return executeTool(tool, rawArgs);
}
