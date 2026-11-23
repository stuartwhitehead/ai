import { Controller, Get, Query } from "@nestjs/common";
import { AiHelpService } from "./ai-help.service.js";

@Controller("api")
export class AiHelpController {
  constructor(private readonly aiHelpService: AiHelpService) {}

  /**
   * Ability to ask a (very limited) question or questions and get a response from AI.
   * The question can be anything along these lines:
   *
   * 1. What time is it?
   * (obviously to test a parameterless tool call).
   * 2. Give me a random number
   * (obviously to test a tool call that has optional parameters).
   * 3. Give me a random number between 1 and 7
   * (obviously to test a tool call with parameters).
   *
   * OR a combination of those:
   *
   * 1. What time is it, and can you generate a random number between 0 and 7?
   * (Obviously to test the Agent Loop and repeated tool calls).
   *
   * @param {string} [question]
   * @return {*}
   * @memberof AiHelpController
   */
  @Get("help")
  help(@Query("question") question?: string) {
    return this.aiHelpService.help(question);
  }
}
