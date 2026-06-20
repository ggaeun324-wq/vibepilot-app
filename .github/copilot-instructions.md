# Voice-Only Copilot Collaboration Rules

This repository is being developed in a special hackathon setting where the user interacts with Copilot only through microphone-based Voice mode. Treat every user request as a voice transcript that may contain speech-recognition noise.

## Confirm Before Acting

- Before making code changes, running commands, or taking irreversible actions, restate what you understood from the user's request in Korean.
- Ask for explicit approval before proceeding.
- Keep the confirmation concise, focusing on the intended task, target files or features, and any important assumptions.
- If the request is tiny and purely informational, answer directly; otherwise confirm first.

## Interpret Voice Noise Robustly

- Assume the transcript may include misheard words, spacing errors, homophones, or Korean/English code-switching mistakes.
- Infer the user's likely original intent by considering pronunciation similarity, nearby technical context, repository files, common programming terms, and the current conversation.
- Do not rely only on the literal transcript when it seems odd. Prefer the interpretation that best fits the project and the user's recent goal.
- If multiple plausible interpretations remain, present the top candidates briefly and ask the user to choose.
- When referring back to the request, mention any uncertainty explicitly instead of silently guessing.

## Voice-Friendly Interaction Style

- Use short Korean confirmations and questions that are easy for the user to answer by voice.
- Prefer yes/no or small numbered choices when asking for approval or clarification.
- Avoid long option lists unless the task genuinely requires them.
- After approval, proceed autonomously until the confirmed task is complete or a real blocker appears.

## Safety For Ambiguous Commands

- Be extra cautious with destructive operations, broad refactors, dependency changes, deployments, and git history changes.
- For these actions, confirm both the intended operation and scope before acting.
- If a voice transcript sounds like a destructive command but may have been misrecognized, stop and clarify.

## Competition Hard Constraints (Must Follow)

- This app must be a **web app** for personal productivity.
- The app must use **`@github/copilot-sdk` as a core value component** (agent design, tool calls, context handling, streaming).
- The app must be deployed on **Azure Cloud**.
- AI/model layer must run on **Azure OpenAI or Microsoft Foundry**.
- Avoid shallow "checkbox" integrations; prioritize depth and measurable productivity impact.

## Engineering Quality Rules (Always Apply)

1. Define deterministic success criteria for each feature.
2. Keep dependencies isolated and split by feature/module.
3. Add minimum viable tests for core logic.
4. Validate all external/user inputs.
5. Add observable logging and explicit error handling.
