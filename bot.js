import "dotenv/config";

import { Client, GatewayIntentBits, PermissionsBitField, EmbedBuilder } from "discord.js";
import axios from "axios";

const TOKEN = process.env.TOKEN;
const API_KEY = process.env.API_KEY;
const CHANNEL_ID = process.env.CHANNEL_ID;

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

let leaderboardMessageId = null;

function formatNumber(num) {
  return num.toLocaleString("en-US");
}

async function fetchLeaderboard() {
  try {
    const now = new Date();

    // Format as YYYY-MM-DD without timezone shift
    const formatDate = (year, month, day) =>
      `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    const from = formatDate(now.getFullYear(), now.getMonth(), 1); // 1st of this month
    const to = formatDate(now.getFullYear(), now.getMonth(), now.getDate()); // today's date

    // Build request body
    const body = {
      apiKey: API_KEY,
      from,
      to,
    };

    console.log("📤 Sending leaderboard request:");
    console.log(JSON.stringify(body, null, 2));

    const res = await axios.post(
      "https://api.hype.bet/wallet/api/v1/affiliate/creator/get-stats",
      body,
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    console.log("📥 Received leaderboard response:");
    console.log(JSON.stringify(res.data, null, 2));

    return res.data;
  } catch (error) {
    console.error("❌ Error fetching leaderboard:");
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", error.response.data);
    } else {
      console.error(error.message);
    }
    return null;
  }
}




async function postLeaderboard() {
  const channel = await client.channels.fetch(CHANNEL_ID);
  if (!channel) return console.error("Leaderboard channel not found.");

  const data = await fetchLeaderboard();
  if (!data?.summarizedBets) return;

  const embed = new EmbedBuilder()
    .setTitle("🏆 Current Wager Leaderboard")
    .setDescription(`From **${new Date(data.dateRange.from).toLocaleDateString()}** to **${new Date(data.dateRange.to).toLocaleDateString()}**`)
    .setColor(0x00AE86)
    .setTimestamp();

          embed.addFields({
          name: "🎁 Prizes",
          value: `🏆 **1st:** $1000\n🥈 **2nd:** $500\n🥉 **3rd:** $300\n🎲 **2 Random Winners:** $100 each`,
          inline: false,
        });

  data.summarizedBets
    .slice(0, 15) // top 15 only
    .forEach((entry, index) => {
      const truncatedWagered = Math.floor(entry.wagered / 100);
      embed.addFields({
        name: `#${index + 1} - ${entry.user.username || "Unknown"}`,
        value: `${truncatedWagered} XP`,
        inline: false,
      });
    });

  if (leaderboardMessageId) {
    try {
      const oldMessage = await channel.messages.fetch(leaderboardMessageId);
      if (oldMessage) await oldMessage.delete();
    } catch {
      console.log("Old leaderboard message not found or already deleted.");
    }
  }

  const newMessage = await channel.send({ embeds: [embed] });
  leaderboardMessageId = newMessage.id;
}

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
  postLeaderboard();
  setInterval(postLeaderboard, 24 * 60 * 60 * 1000); // every 24 hours
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (message.content === "!updateleaderboard") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply("❌ You don't have permission to run this command.");
    }
    await postLeaderboard();
    message.reply("✅ Leaderboard updated!");
  }
});

client.login(TOKEN);
