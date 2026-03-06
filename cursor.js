import axios from "axios";
import readlineSync from "readline-sync";
import { exec } from "child_process";
import { promisify } from "util";
import dotenv from "dotenv";
import os from "os";

dotenv.config();

const asyncExec = promisify(exec);
const platform = os.platform();

const History = [];


async function executeCommand({ command }) {

  // basic safety filter
  if (
    command.includes("rm -rf") ||
    command.includes("sudo") ||
    command.includes("shutdown")
  ) {
    return "Blocked dangerous command";
  }

  try {
    const { stdout, stderr } = await asyncExec(command);

    if (stderr) {
      return `Error: ${stderr}`;
    }

    return `Success: ${stdout}`;
  } catch (err) {
    return `Error: ${err.message}`;
  }
}

const executeCommandDeclaration = {
  name: "executeCommand",
  description: "Execute a single terminal command",
  parameters: {
    type: "object",
    properties: {
      command: {
        type: "string",
        description: "Terminal command. Example: mkdir project",
      },
    },
    required: ["command"],
  },
};

const availableTools = {
  executeCommand,
};


async function askAI() {
  const response = await axios.post(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      model: "openai/gpt-3.5-turbo",

      messages: [
        {
          role: "system",
          content: `
You are an AI coding agent that builds projects using terminal commands.

IMPORTANT RULES:
- Never print code directly.
- Always write code into files using executeCommand.
- Use terminal commands to modify files.

For multi-line files on macOS/Linux use:

cat << 'EOF' > filename
CODE HERE
EOF

Example:

cat << 'EOF' > calculator/index.html
<!DOCTYPE html>
<html>
<head>
<title>Calculator</title>
</head>
<body>
<h1>Calculator</h1>
</body>
</html>
EOF

Always follow this pattern when writing files.
`,
        },
        ...History,
      ],

      tools: [
        {
          type: "function",
          function: executeCommandDeclaration,
        },
      ],

      tool_choice: "auto",
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );

  return response.data.choices[0].message;
}


async function runAgent(userProblem) {
  History.push({
    role: "user",
    content: userProblem,
  });

  while (true) {
    const response = await askAI();

    if (response.tool_calls) {

      History.push(response);

      for (const toolCall of response.tool_calls) {

        const toolName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);

        console.log("\nRunning tool:", toolName);
        console.log("Command:", args.command);

        const toolFunction = availableTools[toolName];

        const result = await toolFunction(args);

        console.log("Result:", result);

        History.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: result,
        });
      }

    } else {

      console.log("\nAI:", response.content);

      History.push({
        role: "assistant",
        content: response.content,
      });

      break;
    }
  }
}

async function main() {

  console.log("Cursor Agent Ready 🚀");
  console.log("OS:", platform);

  while (true) {

    const input = readlineSync.question("\nAsk me anything -> ");

    if (input.toLowerCase() === "exit") {
      console.log("AI: Goodbye 👋");
      process.exit();
    }

    await runAgent(input);
  }
}

main();