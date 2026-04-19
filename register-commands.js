/**
 * Register the /decode slash command with Discord.
 *
 * Run once (or after changing commands):
 *   node register-commands.js
 *
 * Reads DISCORD_APP_ID and DISCORD_BOT_TOKEN from .env.local.
 */

const { readFileSync } = require("fs");

// Parse .env.local
try {
  const lines = readFileSync(".env.local", "utf8").split("\n");
  for (const line of lines) {
    const match = line.match(/^\s*([^#=]+?)\s*=\s*(.*)\s*$/);
    if (match) process.env[match[1]] = match[2];
  }
} catch {
  // .env.local not found — fall back to existing env vars
}

const APP_ID = process.env.DISCORD_APP_ID;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

if (!APP_ID || !BOT_TOKEN) {
  console.error("Set DISCORD_APP_ID and DISCORD_BOT_TOKEN env vars");
  process.exit(1);
}

const command = {
  name: "decode",
  description: "Decode a crypto trading signal into plain English",
  type: 1, // CHAT_INPUT
  options: [
    {
      name: "signal",
      description: "The crypto signal, tweet, or TA post to decode",
      type: 3, // STRING
      required: true,
    },
  ],
};

async function main() {
  const url = `https://discord.com/api/v10/applications/${APP_ID}/commands`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bot ${BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });

  const body = await res.json();
  if (res.ok) {
    console.log("Command registered:", body.name, `(id: ${body.id})`);
  } else {
    console.error("Failed:", res.status, body);
    process.exit(1);
  }
}

main();
