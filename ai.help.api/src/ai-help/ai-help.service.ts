import { AgentService } from "@ai/common";
import { Injectable } from "@nestjs/common";
import { helpTools } from "./tools/help.tools.js";

@Injectable()
export class AiHelpService {
  constructor(private readonly agent: AgentService) {}

  async help(question?: string): Promise<string> {
    if (!question) {
      return "Please provide a question to get help.";
    }
    // I call my little AI library with some functions it can call and will be available as tools, the question as input
    // and a carefully crafted AI prompt to guide the behavior and how AI should handle the question[s].
    return await this.agent.run(
      question,
      "You are a helpful assistant. Use the available tools when asked for help, like telling the current time.",
      // Functions available are get_current_time (parameterless) and get_random_number (has optional parameters).
      { registry: helpTools },
    );
  }
}
