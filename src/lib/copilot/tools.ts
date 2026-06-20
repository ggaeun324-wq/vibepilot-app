import { defineTool } from "@github/copilot-sdk";
import { recommendNextAction, type VibePilotChatContext } from "./project-context";

export function createProjectTools(context: VibePilotChatContext) {
  return [
    defineTool<{ focus?: string }>("recommend_next_action", {
      description: "Recommend the most useful next VibePilot project action with acceptance criteria.",
      parameters: {
        type: "object",
        properties: {
          focus: {
            type: "string",
            description: "Optional focus area from the user, such as planning, testing, GitHub issues, or deployment.",
          },
        },
        additionalProperties: false,
      },
      skipPermission: true,
      defer: "never",
      handler: async ({ focus }) => {
        const recommendation = recommendNextAction(context);
        return {
          ...recommendation,
          focus: focus?.trim() || "current roadmap",
        };
      },
    }),
  ];
}