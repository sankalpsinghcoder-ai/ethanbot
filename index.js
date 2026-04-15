const { 
  Client, GatewayIntentBits, ChannelType, EmbedBuilder, PermissionFlagsBits, 
  ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, 
  ModalBuilder, TextInputBuilder, TextInputStyle 
} = require('discord.js');
const axios = require('axios');

// ⚠️ YOUR NGROK URL (Keep this updated if your free Ngrok URL changes)
const NGROK_URL = "https://jene-shadeful-lala.ngrok-free.dev";

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
    pyq: "https://drive.google.com/drive/folders/1RC9nDXTqYjlFtouk3vLNAmIR9bYCg78x?usp=drive_link",
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

// ================= STORAGE =================
const tempChannels = new Map();
const warnings = new Map();
const userPollers = new Map(); // Keeps track of users running live code

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

  // ================= 1. RECEIVING INPUT FROM MODAL =================
  if (interaction.isModalSubmit() && interaction.customId === 'code_input_modal') {
    const userInput = interaction.fields.getTextInputValue('code_input_field');
    
    try {
      await axios.post(`${NGROK_URL}/input`, {
        userId: interaction.user.id,
        input: userInput
      });
      await interaction.reply({ content: `✅ Input sent: \`${userInput}\``, ephemeral: false });
      // Delete the "Input sent" message after 2 seconds to keep chat clean
      setTimeout(() => interaction.deleteReply().catch(()=>{}), 2000);
    } catch (e) {
      await interaction.reply({ content: "❌ Failed to send input. The program may have already finished.", ephemeral: false });
    }
    return;
  }

  // ================= 2. OPENING INPUT BOX (BUTTON CLICK) =================
  if (interaction.isButton() && interaction.customId === 'send_code_input') {
    const modal = new ModalBuilder()
      .setCustomId('code_input_modal')
      .setTitle('Provide Input to your Code');

    const inputField = new TextInputBuilder()
      .setCustomId('code_input_field')
      .setLabel('Type your input below:')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const row = new ActionRowBuilder().addComponents(inputField);
    modal.addComponents(row);

    await interaction.showModal(modal);
    return;
  }

  // ================= DROPDOWN HANDLER =================
  if (interaction.isStringSelectMenu()) {
    if (interaction.customId === 'delete_channel_select') {
      const channelId = interaction.values[0];
      const channel = interaction.guild.channels.cache.get(channelId);

      if (!channel) {
        return interaction.update({
          content: "❌ Channel not found.",
          components: []
        });
      }

      await channel.delete().catch(console.error);
      tempChannels.delete(channelId);

      return interaction.update({
        content: `✅ Channel **${channel.name}** deleted.`,
        components: []
      });
    }
  }

  // ================= SLASH COMMANDS =================
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
  if (interaction.commandName === 'delete-temp-channel') {
    if (tempChannels.size === 0) {
      return interaction.reply("❌ No temp channels available.");
    }

    const options = [];

    tempChannels.forEach((data, channelId) => {
      const channel = interaction.guild.channels.cache.get(channelId);
      if (channel) {
        options.push({
          label: channel.name,
          value: channel.id
        });
      }
    });

    if (options.length === 0) {
      return interaction.reply("❌ No valid temp channels found.");
    }

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('delete_channel_select')
      .setPlaceholder('Select a channel to delete')
      .addOptions(options.slice(0, 25)); // Discord limit = 25

    const row = new ActionRowBuilder().addComponents(selectMenu);

    await interaction.reply({
      content: "🗑️ Select a temp channel to delete:",
      components: [row],
      ephemeral: true
    });
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
  if (interaction.commandName === 'clear-chat') {
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


  // ================= RUN CODE (NEW LIVE INTERACTIVE VERSION) =================
  if (interaction.commandName === 'run') {
    // 🔥 Ephemeral means ONLY the user who ran it can see it on the server
    await interaction.deferReply({ ephemeral: true }); 

    if (userPollers.has(interaction.user.id)) {
      return interaction.editReply("❌ You already have code running! Please wait for it to finish.");
    }

    let language = interaction.options.getString('language');
    let code = interaction.options.getString('code');
    const file = interaction.options.getAttachment('file');

    // 📂 If file uploaded → get code from file
    if (file) {
      const res = await axios.get(file.url);
      code = res.data;
    }

    // fallback for manual input
    if (code) {
      code = code.replace(/\\n/g, '\n');
    }

    // ❌ if nothing provided
    if (!code) {
      return interaction.editReply("❌ Provide code or upload a file.");
    }

    try {
      // 1. Tell local PC to start the code
      const startRes = await axios.post(`${NGROK_URL}/start`, {
        userId: interaction.user.id,
        language: language,
        code: code
      });

      if (startRes.data.error) {
        return interaction.editReply(startRes.data.error);
      }

      // 2. Setup the "Send Input" Button
      const inputButton = new ButtonBuilder()
        .setCustomId('send_code_input')
        .setLabel('⌨️ Send Input')
        .setStyle(ButtonStyle.Primary);
      const actionRow = new ActionRowBuilder().addComponents(inputButton);

      await interaction.editReply({ 
        content: `⚙️ **Started ${language}...**\nWaiting for output...`, 
        components: [actionRow] 
      });

      // 3. Start Polling your PC for live output every 2 seconds
      const pollInterval = setInterval(async () => {
        try {
          const pollRes = await axios.get(`${NGROK_URL}/poll/${interaction.user.id}`);
          const data = pollRes.data;

          if (data.status === "not_found") {
            clearInterval(pollInterval);
            userPollers.delete(interaction.user.id);
            return;
          }

          let displayOutput = data.output || "Waiting for output/input...";
          // Handle max length to not break Discord messages
          if (displayOutput.length > 1900) {
            displayOutput = displayOutput.substring(displayOutput.length - 1900);
          }

          const messageContent = `🖥️ **Live Terminal (${language})**\n\`\`\`\n${displayOutput}\n\`\`\``;

          if (data.status === "finished") {
            clearInterval(pollInterval);
            userPollers.delete(interaction.user.id);
            await interaction.editReply({ content: messageContent + "\n✅ *Process finished.*", components: [] });
          } else {
            await interaction.editReply({ content: messageContent, components: [actionRow] });
          }
        } catch (e) {
          clearInterval(pollInterval);
          userPollers.delete(interaction.user.id);
          await interaction.editReply({ content: "❌ Lost connection to execution server.", components: [] });
        }
      }, 2000); // Polls every 2000 milliseconds

      userPollers.set(interaction.user.id, pollInterval);

    } catch (error) {
      console.error(error.message);
      await interaction.editReply("❌ Execution server is offline. Check if `runner.js` and Ngrok are running on your PC.");
    }
  }


  // ================= BADGE =================
  if (interaction.commandName === 'badge') {
    const language = interaction.options.getString('language');

    const roleMap = {
      python: "🐍 Python",
      javascript: "🟨 JavaScript",
      c: "⚙️ C",
      cpp: "⚙️⚙️ C++",
      java: "☕ Java"
    };

    const roleName = roleMap[language];
    const member = interaction.member;

    // remove old badges
    for (let key in roleMap) {
      const r = interaction.guild.roles.cache.find(x => x.name === roleMap[key]);
      if (r && member.roles.cache.has(r.id)) {
        await member.roles.remove(r);
      }
    }

    // add new badge
    const role = interaction.guild.roles.cache.find(r => r.name === roleName);

    if (!role) {
      return interaction.reply("❌ Role not found. Create roles first.");
    }

    await member.roles.add(role);

    await interaction.reply({ content: `🏷️ Badge updated → **${roleName}**`, ephemeral: true });
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
