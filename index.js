const { Client, GatewayIntentBits, ChannelType, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const OpenAI = require('openai');


// ================= STUDY MATERIALS DATABASE =================
const studyMaterial = {
  1: {
    main: "https://drive.google.com/drive/folders/1oVHp_X5TPCttLZjgZJPSHEqhq98cRn_2?usp=sharing",
    pyq: "https://drive.google.com/drive/folders/1Two0a97eKLk2zrWjd0v-WOlJsoCorskO?usp=sharing",
    subjects: {
      math: "https://drive.google.com/drive/folders/1b7rTn76hCW67NCjtAowesbI3jjaaILe-?usp=drive_link",
      foc: "https://drive.google.com/drive/folders/1Uk9p4F9db8qx-EhcZx7iGmMrOJJt1M_i?usp=drive_link",
      c: "https://drive.google.com/drive/folders/1FxDd_K1M5q8KDZQQf0AIIIxLJC3uyTIx?usp=drive_link"
    }
  },
  2: {
    main: "https://drive.google.com/drive/folders/157XQ0sNZE368MLCK2B5awQfJn-cXeMr8?usp=sharing",
    pyq: "❌ PYQs for Semester 2 are not currently available.",
    subjects: {
      sad: "https://drive.google.com/drive/folders/1NcohhRxvUkVwNoihR8SzLyI5NzRkGiMD?usp=drive_link",
      mmt: "https://drive.google.com/drive/folders/1gXToALWgR3-Lmy0nHkjVb4SOE8V9xydx?usp=drive_link",
      dsa: "https://drive.google.com/drive/folders/1_z8AdMsz2UOU1a4PoAuI4FzHeKNt27Ht?usp=drive_link",
      cpp: "https://drive.google.com/drive/folders/1dA9aKILjWCcn_7hXSuNjnQm1yX9Xy462?usp=drive_link"
    }
  }
};

const topicNames = {
  math: "Math",
  foc: "Fundamentals of Computer",
  c: "C Programming",
  sad: "System Analysis and Design",
  mmt: "Multimedia Tools",
  dsa: "Data Structures and Algorithms",
  cpp: "C++"
};

// ================= TEMP CHANNEL STORAGE =================
const tempChannels = new Map();
// ================= WARNINGS STORAGE =================
const warnings = new Map();

const openai = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY,
  baseURL: 'https://integrate.api.nvidia.com/v1',
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ]
});

client.on('ready', () => {
  console.log("==================================================");
  console.log(`  Bot Online: ${client.user.tag}`);
  console.log("==================================================");
});

// ================= INTERACTIONS =================
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  // ================= STUDY (NOTES & PYQ) =================
  if (interaction.commandName === 'study') {
    const subcommand = interaction.options.getSubcommand();
    const sem = subcommand === 'sem1' ? 1 : 2; 
    
    const topic = interaction.options.getString('topic');
    const semData = studyMaterial[sem];

    if (topic === 'main') {
      return interaction.reply(`📁 **Semester ${sem} Main Notes Folder:**\n${semData.main}`);
    }

    if (topic === 'pyq') {
      return interaction.reply(`📄 **Semester ${sem} Previous Year Papers (PYQs):**\n${semData.pyq}`);
    }

    const subjectLink = semData.subjects[topic];
    return interaction.reply(`📘 **${topicNames[topic]} Notes (Semester ${sem}):**\n${subjectLink}`);
  }

  // ================= CREATE =================
  if (interaction.commandName === 'create') {
    const name = interaction.options.getString('name');
    const type = interaction.options.getString('type');

    try {
      const categoryName = type === 'voice' ? "VOICE CHANNELS" : "TEMP CHANNELS";

      let category = interaction.guild.channels.cache.find(
        c => c.name === categoryName && c.type === ChannelType.GuildCategory
      );

      if (!category) {
        category = await interaction.guild.channels.create({
          name: categoryName,
          type: ChannelType.GuildCategory
        });
      }

      const channel = await interaction.guild.channels.create({
        name: name,
        type: type === 'voice'
          ? ChannelType.GuildVoice
          : ChannelType.GuildText,
        parent: category.id
      });

      tempChannels.set(channel.id, {
        creator: interaction.user.id,
        type: type
      });

      if (type === 'voice') {
        const member = interaction.member;
        if (member.voice.channel) {
          await member.voice.setChannel(channel);
        }
        await interaction.reply(`🎤 Voice channel created: ${channel}`);
      }

      if (type === 'text') {
        await interaction.reply(`💬 Channel created in TEMP CHANNELS category: ${channel}`);
      }

    } catch (err) {
      interaction.reply("❌ Failed to create channel");
    }
  }

  // ================= DELETE =================
  if (interaction.commandName === 'delete') {
    const channel = interaction.channel;

    if (!tempChannels.has(channel.id)) {
      return interaction.reply("❌ Not a temp channel");
    }

    await interaction.reply("🗑️ Deleting this channel...");
    await channel.delete().catch(console.error);
    tempChannels.delete(channel.id);
  }

  // ================= WHOIS =================
  if (interaction.commandName === 'whois') {
    const target = interaction.options.getMember('name') || interaction.member;
    const user = target.user;

    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle(`🕵️ User Info: ${user.tag}`)
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '🆔 ID', value: user.id, inline: true },
        { name: '📅 Joined Server', value: `<t:${Math.floor(target.joinedTimestamp / 1000)}:R>`, inline: true },
        { name: '🎂 Account Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
        { name: '🎭 Roles', value: target.roles.cache.map(r => r).join(' ').replace('@everyone', '') || 'None' }
      );

    await interaction.reply({ embeds: [embed] });
  }

  // ================= WARN =================
  if (interaction.commandName === 'warn') {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: "❌ You don't have permission!", ephemeral: true });
    }

    const action = interaction.options.getSubcommand();
    const target = interaction.options.getUser('name');
    let currentWarnings = warnings.get(target.id) || 0;

    if (action === 'add') {
      currentWarnings += 1;
      warnings.set(target.id, currentWarnings);
      await interaction.reply(`⚠️ **${target.tag}** has been warned. They now have **${currentWarnings}** warning(s).`);
    } else if (action === 'remove') {
      currentWarnings = Math.max(0, currentWarnings - 1);
      warnings.set(target.id, currentWarnings);
      await interaction.reply(`✅ Removed a warning from **${target.tag}**. They now have **${currentWarnings}** warning(s).`);
    }
  }


  // ================= TEMPROLE =================
  if (interaction.commandName === 'temprole') {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: "❌ You don't have permission!", ephemeral: true });
    }

    const subcommand = interaction.options.getSubcommand();
    const targetUser = interaction.options.getMember('user');
    const role = interaction.options.getRole('role');

    if (!targetUser) {
      return interaction.reply({ content: "❌ User not found!", ephemeral: true });
    }
    if (!role) {
      return interaction.reply({ content: "❌ Role not found!", ephemeral: true });
    }

    try {
      if (subcommand === 'add') {
        if (targetUser.roles.cache.has(role.id)) {
          return interaction.reply({ content: `✅ **${targetUser.user.tag}** already has the **${role.name}** role.`, ephemeral: true });
        }
        await targetUser.roles.add(role);
        await interaction.reply(`✅ Added the **${role.name}** role to **${targetUser.user.tag}**.`);
      } else if (subcommand === 'remove') {
        if (!targetUser.roles.cache.has(role.id)) {
          return interaction.reply({ content: `❌ **${targetUser.user.tag}** does not have the **${role.name}** role.`, ephemeral: true });
        }
        await targetUser.roles.remove(role);
        await interaction.reply(`✅ Removed the **${role.name}** role from **${targetUser.user.tag}**.`);
      }
    } catch (error) {
      console.error("Error managing role:", error);
      await interaction.reply({ content: "❌ Failed to manage role. Please check bot permissions and role hierarchy.", ephemeral: true });
    }
  }

  // ================= DEL (CLEAR MESSAGES) =================
  if (interaction.commandName === 'del') {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: "❌ You don't have permission!", ephemeral: true });
    }

    const amount = interaction.options.getInteger('amount') || 100;
    const channel = interaction.channel;

    if (channel.type !== ChannelType.GuildText) {
      return interaction.reply({ content: "❌ This command can only be used in text channels.", ephemeral: true });
    }

    try {
      await interaction.deferReply({ ephemeral: true }); // Acknowledge the interaction while messages are being fetched/deleted
      const fetchedMessages = await channel.messages.fetch({ limit: amount });
      await channel.bulkDelete(fetchedMessages, true); // true to filter out messages older than 14 days
      await interaction.editReply(`✅ Cleared **${fetchedMessages.size}** messages in this channel.`);
    } catch (error) {
      console.error("Error clearing messages:", error);
      await interaction.editReply({ content: "❌ Failed to clear messages. Ensure the bot has 'Manage Messages' permission and messages are not older than 14 days.", ephemeral: true });
    }
  }

  // ================= KICK =================
  if (interaction.commandName === 'kick') {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: "❌ You don't have permission!", ephemeral: true });
    }

    const target = interaction.options.getMember('user');

    if (!target) {
      return interaction.reply({ content: "❌ User not found!", ephemeral: true });
    }
    if (!target.kickable) {
      return interaction.reply({ content: "❌ I cannot kick this user. They might have a higher role or I lack permissions.", ephemeral: true });
    }
    if (target.id === interaction.user.id) {
        return interaction.reply({ content: "❌ You cannot kick yourself!", ephemeral: true });
    }
    if (target.id === client.user.id) {
        return interaction.reply({ content: "❌ I cannot kick myself!", ephemeral: true });
    }


    try {
      await target.kick();
      await interaction.reply(`✅ **${target.user.tag}** has been kicked from the server.`);
    } catch (error) {
      console.error("Error kicking user:", error);
      await interaction.reply({ content: "❌ Failed to kick user. Please check bot permissions.", ephemeral: true });
    }
  }

  // ================= LOCK & UNLOCK =================
  if (interaction.commandName === 'lock' || interaction.commandName === 'unlock') {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: "❌ You don't have permission!", ephemeral: true });
    }

    const channel = interaction.channel;

    if (interaction.commandName === 'lock') {
      const timer = interaction.options.getString('timer');

      await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false });
      await interaction.reply(`🔒 Channel Locked.`);

      // If a timer like "1h" or "30m" was provided
      if (timer) {
        let ms = 0;
        if (timer.endsWith('h')) ms = parseInt(timer) * 3600000;
        else if (timer.endsWith('m')) ms = parseInt(timer) * 60000;

        if (ms > 0) {
          await interaction.followUp(`⏳ This channel will unlock in **${timer}**.`);
          setTimeout(async () => {
            await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: null });
            channel.send(`🔓 Channel automatically unlocked.`);
          }, ms);
        }
      }
    } else {
      await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: null });
      await interaction.reply(`🔓 Channel Unlocked.`);
    }
  }



  // ================= AI (NVIDIA) =================
  if (interaction.commandName === 'ai') {
    const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY; // Ensure this env var is set!

    if (!NVIDIA_API_KEY) {
      return interaction.reply({ content: "❌ AI API key is not configured. Please contact the bot owner.", ephemeral: true });
    }

    await interaction.deferReply(); // Acknowledge the command immediately
    const question = interaction.options.getString('question');
    let fullResponse = '';

    try {
      const completion = await openai.chat.completions.create({
        model: "deepseek-ai/deepseek-v3.1",
        messages: [{"role":"user","content": question}],
        temperature: 0.2,
        top_p: 0.7,
        max_tokens: 8192,
        chat_template_kwargs: {"thinking":false},
        stream: true
      });

      // Process the streaming response chunks
      for await (const chunk of completion) {
        const delta = chunk.choices[0]?.delta;
        if (delta?.content) {
          fullResponse += delta.content;
        }
      }

      // After the loop finishes, fullResponse contains the complete AI output
      if (fullResponse.length === 0) {
        return interaction.editReply("🤷‍♂️ I couldn't get a response from the AI. Please try again later.");
      }

      const MAX_MESSAGE_LENGTH = 2000;
      if (fullResponse.length <= MAX_MESSAGE_LENGTH) {
        await interaction.editReply(`🧠 **AI Response:**\n${fullResponse}`);
      } else {
        // Split into multiple messages if the response is too long for one Discord message
        const parts = [];
        let currentPart = '';
        const lines = fullResponse.split('\n');

        for (const line of lines) {
          if ((currentPart + line + '\n').length > MAX_MESSAGE_LENGTH) {
            parts.push(currentPart);
            currentPart = line + '\n';
          } else {
            currentPart += line + '\n';
          }
        }
        if (currentPart.length > 0) {
          parts.push(currentPart);
        }

        // Send the first part as an edit to the deferred reply
        await interaction.editReply(`🧠 **AI Response (Part 1):**\n${parts[0]}`);

        // Send subsequent parts as follow-up messages
        for (let i = 1; i < parts.length; i++) {
          await interaction.followUp(`🧠 **AI Response (Part ${i + 1}):**\n${parts[i]}`);
        }
      }

    } catch (error) {
      console.error("OpenAI API Error:", error.response?.status, error.response?.data || error.message);
      await interaction.editReply("❌ Failed to get a response from the AI. There might be an issue with the API service or configuration. Please check the bot's console for more details.");
    }
  }

});


// ================= AUTO DELETE VOICE =================
client.on('voiceStateUpdate', (oldState) => {
  const channel = oldState.channel;

  if (!channel) return;

  if (tempChannels.has(channel.id)) {
    if (channel.members.size === 0) {
      channel.delete().catch(console.error);
      tempChannels.delete(channel.id);
    }
  }
});

// ================= AUTO DELETE TEXT =================
setInterval(() => {
  tempChannels.forEach((data, channelId) => {
    if (data.type !== 'text') return;

    const channel = client.channels.cache.get(channelId);
    if (!channel) return;

    const lastMessage = channel.lastMessage;
    if (!lastMessage) return;

    const diff = Date.now() - lastMessage.createdTimestamp;

    if (diff > 60000) { // Keep text channels for 1 minute of inactivity before deleting
      channel.delete().catch(console.error);
      tempChannels.delete(channelId);
    }
  });
}, 30000);

// ================= LOGIN =================
client.login(process.env.TOKEN);

const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send("Bot is running!");
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
