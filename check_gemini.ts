import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from "dotenv";
dotenv.config({ path: "apps/team-api/.env" });

async function listModels() {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
  const data: any = await response.json();
  const models = data?.models?.filter((m: any) => m.name.includes("embed"));
  console.log(JSON.stringify(models, null, 2));
}

listModels().catch((e) => console.error(e));
