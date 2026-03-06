import axios from "axios";
import readlineSync from "readline-sync";
import dotenv from "dotenv";
dotenv.config();
const History = [];

function sum({ num1, num2 }) {
  return num1 + num2;
}

function prime({ num }) {

  if (num < 2) return false;

  for (let i = 2; i <= Math.sqrt(num); i++) {
    if (num % i === 0) return false;
  }

  return true;
}

async function getCryptoPrice({ coin }) {

  const response = await fetch(
    `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${coin}`
  );

  const data = await response.json();

  if (data.length === 0) return "Crypto not found";

  return `${coin} price is $${data[0].current_price}`;
}

const availableTools = {
  sum,
  prime,
  getCryptoPrice
};

async function askAI() {

  try {

    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "openai/gpt-3.5-turbo",
        messages: History
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    return response.data.choices[0].message.content;

  } catch (err) {

    console.log("API Error:", err.response?.data || err.message);
    return "AI service temporarily unavailable.";

  }
}
async function checkTool(userInput) {

  const numbers = userInput.match(/\d+/g)?.map(Number);

  if (userInput.includes("sum") && numbers?.length >= 2) {

    const result = sum({ num1: numbers[0], num2: numbers[1] });

    return `The sum is ${result}`;
  }

  if (userInput.includes("prime") && numbers?.length >= 1) {

    const result = prime({ num: numbers[0] });

    return result
      ? `${numbers[0]} is a prime number`
      : `${numbers[0]} is not a prime number`;
  }

  if (userInput.includes("price")) {

    const words = userInput.split(" ");

    const coin = words[words.length - 1].toLowerCase();

    return await getCryptoPrice({ coin });
  }

  return null;
}


async function runAgent(userProblem) {

  const toolResult = await checkTool(userProblem);

  if (toolResult) {
    console.log("AI:", toolResult);
    return;
  }

  History.push({
    role: "user",
    content: userProblem
  });

  const response = await askAI();

  console.log("AI:", response);

  History.push({
    role: "assistant",
    content: response
  });
}


async function main() {

  while (true) {

    const userProblem = readlineSync.question("\nAsk me anything -> ");
    if (userProblem.toLowerCase() === "exit") {
      console.log("AI: Goodbye!");
      break;
    }
    await runAgent(userProblem);
  }
}

main();