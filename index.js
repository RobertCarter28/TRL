
require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences
  ]
});

// Temporary activity storage.
// We'll connect Supabase in the next stage.
const activePlayers = new Map();

const commands = [
  new SlashCommandBuilder()
    .setName("checkin")
    .setDescription("Check in as an active TRL league member"),

  new SlashCommandBuilder()
    .setName("activity")
    .setDescription("View active TRL league members")
].map(command => command.toJSON());

client.once("ready", async () => {
  console.log(`${client.user.tag} is online!`);

  const rest = new REST({ version: "10" })
    .setToken(process.env.DISCORD_TOKEN);

  try {
    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
      ),
      { body: commands }
    );

    console.log("TRL commands registered!");
  } catch (error) {
    console.error("Command registration failed:", error);
  }
});

// Track Discord online status changes.
client.on("presenceUpdate", (oldPresence, newPresence) => {
  const member = newPresence.member;
  if (!member) return;

  const status = newPresence.status;

  console.log(
    `${member.user.username} is now ${status}`
  );
});

// Track new members.
client.on("guildMemberAdd", member => {
  console.log(`${member.user.username} joined TRL.`);
});

client.on("guildMemberRemove", member => {
  console.log(`${member.user.username} left TRL.`);
});

// League check-in commands.
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "checkin") {
    activePlayers.set(interaction.user.id, {
      username: interaction.user.username,
      checkedInAt: new Date().toISOString()
    });

    await interaction.reply({
      content: `✅ ${interaction.user.username} checked in to The Reaper Lounge!`,
      ephemeral: true
    });
  }

  if (interaction.commandName === "activity") {
    if (activePlayers.size === 0) {
      return interaction.reply({
        content: "No league members have checked in yet.",
        ephemeral: true
      });
    }

    const list = [...activePlayers.values()]
      .map(player => `• ${player.username}`)
      .join("\n");

    await interaction.reply({
      content: `**TRL Active League Members**\n${list}`,
      ephemeral: true
    });
  }
});

client.login(process.env.DISCORD_TOKEN);
