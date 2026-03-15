const dotenv = require("dotenv");
dotenv.config({ path: "apps/team-api/.env" });

async function listModels() {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
  const data = await response.json();
  const models = data?.models?.filter(m => m.name.includes("embed"));
  console.log(JSON.stringify(models, null, 2));
}

listModels().catch((e) => console.error(e));
