import { elizaLogger } from "@elizaos/core";
import {
  Action,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  Plugin,
  State,
} from "@elizaos/core";

// Base URLs to avoid repeating ourselves
const BASE_PROXY_URL = process.env.BASE_PROXY_URL;
const AGENT_DID = process.env.AGENT_DID;

// Bearer token for authorization
const AUTH_TOKEN = process.env.NEVERMINED_AUTH_TOKEN;

// Construct final endpoints
const TASK_CREATION_URL = `${BASE_PROXY_URL}/api/v1/agents/${AGENT_DID}/tasks`;
const TASK_POLL_URL_BASE = `${BASE_PROXY_URL}/api/v1/agents/${AGENT_DID}/tasks/`;

/**
 * A small helper function to preprocess the user prompt,
 * removing mentions or known phrases that are not relevant.
 */
function preprocessUserPrompt(rawText: string): string {
  // Example approach: remove any bot mentions or leading commands
  let cleaned = rawText
    // Remove direct mentions like @agent or <@1234567890>
    .replace(/<@\d+>/g, "")
    .replace(/@[\w-]+/g, "")
    // Remove a few known patterns (case-insensitive)
    .replace(/i want you to (create|make) a movie script about/gi, "")
    .replace(/(generate|create|make) (a )?movie script about/gi, "")
    .replace(/\bplease\b/gi, "")
    .trim();

  // Optionally uppercase first letter, or any additional logic
  if (cleaned.length > 0) {
    cleaned = cleaned[0].toUpperCase() + cleaned.slice(1);
  }

  return cleaned;
}

/**
 * Action that sends the user's prompt to an agent service,
 * then polls every 5 seconds until "Completed".
 */
const generateMovieScriptAction: Action = {
  name: "GENERATE_MOVIE_SCRIPT",
  similes: [
    "MOVIE_SCRIPT",
    "SCRIPT_GENERATION",
    "CREATE_SCRIPT",
    "MAKE_SCRIPT",
    "FILM_SCRIPT",
    "MOVIE_GEN",
  ],
  description: "Generate a movie script by calling a remote agent service",

  // We do not need a special validate here, so always return true
  validate: async (_runtime: IAgentRuntime, _message: Memory) => {
    return true;
  },

  handler: async (
    _runtime: IAgentRuntime,
    _message: Memory,
    _state: State,
    _options: any,
    callback: HandlerCallback
  ) => {
    // 1) Extract and preprocess user's prompt
    const rawUserPrompt = _message.content.text?.trim() || "";
    const userPrompt = preprocessUserPrompt(rawUserPrompt);

    if (userPrompt.length < 5) {
      callback({
        text: "Please provide a more detailed movie script prompt (at least 5 characters).",
      });
      return;
    }

    // 2) Send POST request to create the task
    try {
      const fetchFn = _runtime.fetch || fetch;

      const requestBody = JSON.stringify({ query: userPrompt });
      const response = await fetchFn(TASK_CREATION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${AUTH_TOKEN}`,
        },
        body: requestBody,
      });

      if (!response.ok) {
        const errorText = await response.text();
        callback({
          text: `Error creating task: ${response.status} - ${response.statusText}\n${errorText}`,
        });
        return;
      }

      const creationData = await response.json();
      // 3) Extract task_id
      const taskId = creationData?.task?.task_id;
      if (!taskId) {
        callback({
          text: "Did not receive a valid task_id from the server.",
        });
        return;
      }

      // Inform the user about the created task
      callback({
        text: `This might take a few minutes.\nPlease wait...`,
      });

      // 4) Poll every 5 seconds until "task_status" = "Completed" or "Failed"
      let taskStatus = creationData?.task?.task_status || "Pending";
      let output = null;
      let outputArtifacts = null;
      let intents = 0;

      while (taskStatus === "Pending" && intents < 120) {
        // Wait 5 seconds
        await new Promise((resolve) => setTimeout(resolve, 5000));
        elizaLogger.info(`Polling task status for ID: ${taskId}`);

        const pollResponse = await fetchFn(`${TASK_POLL_URL_BASE}${taskId}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${AUTH_TOKEN}`,
          },
        });

        if (!pollResponse.ok) {
          const errorText = await pollResponse.text();
          callback({
            text: `Error polling task status: ${pollResponse.status} - ${pollResponse.statusText}\n${errorText}`,
          });
          return;
        }

        const pollData = await pollResponse.json();
        taskStatus = pollData?.task?.task_status || "Pending";

        elizaLogger.info(`Task status for ID ${taskId}: ${taskStatus}`);

        if (taskStatus === "Completed") {
          output = pollData?.task?.output;
          outputArtifacts = JSON.parse(pollData?.task?.output_artifacts);
          break;
        }
        if (taskStatus === "Failed") {
          callback({
            text: `Task failed with ID: ${taskId}`,
          });
          return;
        }
        intents++;
      }

      if (intents >= 120) {
        callback({
          text: `Task took too long to complete. Please try again later.`,
        });
        return;
      }

      // 5) Once "Completed", return the final info
      if (!output && !outputArtifacts) {
        callback({
          text: `Task ${taskId} is "Completed" but no output was found.`,
        });
        return;
      }

      const content = {
        text: output,
      };

      callback(content, outputArtifacts.artifacts);
    } catch (error) {
      elizaLogger.error("Error in GENERATE_MOVIE_SCRIPT action:", error);
      callback({
        text: `An error occurred while contacting the agent:\n${error.message}`,
        error: true,
      });
    }
  },

  // Examples of how users might invoke this action
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Generate a movie script about a time-traveling detective",
        },
      },
      {
        user: "{{agentName}}",
        content: {
          text: 'Generating a movie script based on your prompt: "a time-traveling detective". Please wait...',
          action: "GENERATE_MOVIE_SCRIPT",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "I want a script featuring pirates on Mars.",
        },
      },
      {
        user: "{{agentName}}",
        content: {
          text: 'Generating a movie script based on your prompt: "pirates on Mars". Please wait...',
          action: "GENERATE_MOVIE_SCRIPT",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "@agent Please create a movie script about an alien invasion in the 1950s",
        },
      },
      {
        user: "{{agentName}}",
        content: {
          text: 'Generating a movie script based on your prompt: "An alien invasion in the 1950s". Please wait...',
          action: "GENERATE_MOVIE_SCRIPT",
        },
      },
    ],
  ],
};

/**
 * Plugin that includes our movie script action for remote generation,
 * posting user prompt to the external agent server, then polling until completion.
 */
export const movieScriptGenerationPlugin: Plugin = {
  name: "movieScriptGenerationPlugin",
  description:
    "A plugin that sends user prompts to an external agent to generate a movie script, polling until completed",
  actions: [generateMovieScriptAction],
  evaluators: [],
  providers: [],
};
