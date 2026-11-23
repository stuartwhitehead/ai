import OpenAI from "openai";
import {
  ResponseCreateParamsNonStreaming,
  ResponseFormatTextConfig,
  ResponseInputItem,
  Tool,
} from "openai/resources/responses/responses.js";
import { executeRegisteredTool } from "../tools/tool-executor.js";
import { ToolRegistry } from "../tools/tool.types.js";
import { createToolDefinitions } from "../tools/tool-definition.js";

// The guts of the operation, this service makes the actual calls to Open AI and handles its
// request[s] for any tool calls in a Agent Loop (also known as the Tool Calling Loop or ReAct
// Loop depending where you read about working with AI models).  When AI responds with anything
// that is not a tool call, we respond with the result.
export class AgentService {
  private readonly openai: OpenAI;

  constructor() {
    this.openai = new OpenAI();
  }

  // Duck type sniffing, returns true only if the AI response item is of type "function_call".
  private isFunctionCall(
    item: OpenAI.Responses.ResponseOutputItem,
  ): item is OpenAI.Responses.ResponseFunctionToolCall {
    return item.type === "function_call";
  }

  /**
   * Builds and sends a request to the OpenAI Responses API using the supplied input, instructions, and tools.
   * It links the request to a previous response when provided, requires a tool choice for an initial request
   * when tools are available, and applies the optional response format.
   *
   * @private
   * @param {(string | ResponseInputItem[])} This can either be the initial question/action for the AI model
   * or one or many results from requested tool call requests.
   * @param {string} instructions a carefully engineered set of instructions of how the AI model should
   * behave, process and respond to inputs.
   * @param {Tool[]} tools Tool definitions using Open Ai's options that the model can request.
   * @param {string} [previousResponseId] Depending on where we are in the Agent Loop, provide the previous
   * responses ID.  This allows us to provided to the model as a contextual link between this request and
   * the one previous.
   * @param {ResponseFormatTextConfig} [responseFormat] ability to provide a response schema so I can directly
   * shape responses if required.
   * @return {*}  {Promise<OpenAI.Responses.Response>}
   * @memberof AgentService
   */
  private async getAgentResponse(
    input: string | ResponseInputItem[],
    instructions: string,
    tools: Tool[],
    previousResponseId?: string,
    responseFormat?: ResponseFormatTextConfig,
  ): Promise<OpenAI.Responses.Response> {
    const responseOptions: ResponseCreateParamsNonStreaming = {
      model: "gpt-5.4-mini",
      instructions,
      tools,
      input,
    };

    if (previousResponseId) {
      responseOptions.previous_response_id = previousResponseId;
    } else if (tools.length > 0) {
      responseOptions.tool_choice = "required";
    }

    if (responseFormat) {
      responseOptions.text = {
        format: responseFormat,
      };
    }

    return await this.openai.responses.create(responseOptions);
  }

  /**
   * Sends the input and instructions to the AI model, optionally providing registered tools and a
   * response format.  If the model requests a tool, the function executes it and sends the result[s]
   * back to the model, repeating as needed until the model returns a final response.
   *
   * @param {string} input, the question/action for the AI model, for instance "What time is it and give me
   * a random number between 1 and 99".  The response to the input is directly linked to the AI prompt
   * AKA instructions below and its ability to respond as expected.
   * @param {string} instructions a carefully engineered set of instructions of how the AI model should
   * behave, process and respond to inputs.
   * @param {{
   *       registry?: ToolRegistry;
   *       responseFormat?: ResponseFormatTextConfig;
   *     }} [options={}]
   * The options allow the caller to provide the physical representation of tools available to the AI model.
   * Also allows the ability to provide a response schema so I can directly shape responses if required.
   * @return {*}  {Promise<string>}
   * @memberof AgentService
   */
  async run(
    input: string,
    instructions: string,
    options: {
      registry?: ToolRegistry;
      responseFormat?: ResponseFormatTextConfig;
    } = {},
  ): Promise<string> {
    const { registry, responseFormat } = options;

    // Convert the physical tool call functions, descriptions etc into the option format expected by Open
    // AI to register the available tools when making the call to the Ai model.
    const tools = registry ? createToolDefinitions(registry) : [];

    // Initial Open AI call outside of the Agent Loop, obviously no previous response ID and the input is the original
    // question along with the engineered prompt (instructions).  If we have tools available, those will be passed too
    // along with the optional response format.
    let response = await this.getAgentResponse(
      input,
      instructions,
      tools,
      undefined,
      responseFormat,
    );

    // TODO: we should have a max iterations guard here in this Agent Loop.
    while (true) {
      // Will hold all the tool call results, linking back directly to the original tool call request item by ID.
      const toolOutputs: ResponseInputItem[] = [];

      // The response can have one or many outputs, some may or may not be tool calls.
      for (const item of response.output) {
        // is this a tool call request item or not?
        if (this.isFunctionCall(item)) {
          if (!registry) {
            // AI requested a tool but the caller of run did not provide the physical tool definitions,
            // maybe they never expected the AI model to request any, so not choice but to explode here flower.
            throw new Error(
              `Received tool call "${item.name}" without a tool registry.`,
            );
          }

          // I execute the tool requested with the arguments supplied by AI if:
          // 1. I find a matching tool name (literal function signature) in the tool registry lookup.
          // 2. I can parse the function call arguments successfully with the supplied Zod schema.
          const result = executeRegisteredTool(
            registry,
            item.name,
            item.arguments,
          );

          // Output from the function involved could be anything, for now I've taken a very simple
          // handling approach where the output is either a string or an object.  TODO: harden this
          // and take into account the full gamut of possible outputs.
          const output =
            typeof result === "string"
              ? result
              : (JSON.stringify(result) ?? String(result));

          // Add the tool call result so we can provide the AI model with them.
          toolOutputs.push({
            // Hard coded to function call output since thats all we care about.
            type: "function_call_output",
            // Critical to supply the ID of the output item from the AI model response outputs so that
            // the the AI model can link the resulting output of the tool call here to the original
            // request for the tool call itself.
            call_id: item.call_id,
            // Value of the tool call for the AI model to digest.
            output,
          });
        }
      }

      if (toolOutputs.length === 0) {
        // No more tool calls, Agent Loop ends and we response with the final response to the whole thing.
        return response.output_text.trim();
      }

      // Around we go, we have all the results from the tool calls so I initiate another request to Open AI
      // passing in the tool call outputs (instead of the original input question), the original engineered
      // prompt, tools etc.  Note the previous AI model response ID is provided to the model as a contextual
      // link between this request and the one previous, a chain.  The toolOutputs themselves having the ID
      // of the output item of the previous AI model response too, a direct link between the tool execution
      // request and the result of that tool being called on its behalf using the parameters it supplied.
      response = await this.getAgentResponse(
        toolOutputs,
        instructions,
        tools,
        response.id,
        responseFormat,
      );
    }
  }
}
