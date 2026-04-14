const { 
  Client, GatewayIntentBits, ChannelType, EmbedBuilder, PermissionFlagsBits, 
  ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, 
  ModalBuilder, TextInputBuilder, TextInputStyle 
} = require('discord.js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

// ================= SETUP TEMP DIR =================
const tempDir = path.join(__dirname, "temp");
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

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
      sad: "https://drive.google.com/drive/folders/1NcohhRxvUkVwNoihR8SzLyI5NzRkGiMD?usp=drive_link || OR || Mamta Mam Notes: https://drive.google.com/drive/folders/1kaA6f_4Bw55R67LOmny6PUzs6FjT9vP3?usp=drive_link",
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

// ================= STORAGE MAPS =================
const tempChannels = new Map();
const warnings = new Map();
const activeSessions = new Map(); // KEEPS TRACK OF USER'S RUNNING CODE

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

  // ================= MODAL SUBMIT (RECEIVING CODE INPUT) =================
  if (interaction.isModalSubmit() && interaction.customId === 'code_input_modal') {
    const userInput = interaction.fields.getTextInputValue('code_input_field');
    const session = activeSessions.get(interaction.user.id);

    if (!session) {
      return interaction.reply({ content: "❌ Your code execution session has ended or expired.", ephemeral: true });
    }

    // Send the input directly to the running program
    session.process.stdin.write(userInput + "\n");
    
    // Add what the user typed to the visual output so they can see it
    session.output += `> ${userInput}\n`;
    
    await interaction.reply({ content: `✅ Input sent: \`${userInput}\``, ephemeral: true });
    
    // delete the "input sent" message after 2 seconds to keep it clean
    setTimeout(() => interaction.deleteReply().catch(()=>{}), 2000); 
    return;
  }

  // ================= BUTTON CLICK (OPENING INPUT BOX) =================
  if (interaction.isButton() && interaction.customId === 'send_code_input') {
    const session = activeSessions.get(interaction.user.id);
    if (!session) {
      return interaction.reply({ content: "❌ No active code session found.", ephemeral: true });
    }

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

  // ================= DROPDOWN HANDLER (DELETE CHANNELS) =================
  if (interaction.isStringSelectMenu()) {
    if (interaction.customId === 'delete_channel_select') {
      const channelId = interaction.values[0];
      const channel = interaction.guild.channels.cache.get(channelId);

      if (!channel) {
        return interaction.update({ content: "❌ Channel not found.", components: [] });
      }

      await channel.delete().catch(console.error);
      tempChannels.delete(channelId);

      return interaction.update({ content: `✅ Channel **${channel.name}** deleted.`, components: [] });
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

    if (topic === 'main') return interaction.reply(`📁 **Semester ${sem} Main Notes Folder:**\n${semData.main}`);
    if (topic === 'pyq') return interaction.reply(`📄 **Semester ${sem} Previous Year Papers (PYQs):**\n${semData.pyq}`);

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
        type: type === 'voice' ? ChannelType.GuildVoice : ChannelType.GuildText,
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
        options.push({ label: channel.name, value: channel.id });
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

    if (!targetUser) return interaction.reply({ content: "❌ User not found!", ephemeral: true });
    if (!role) return interaction.reply({ content: "❌ Role not found!", ephemeral: true });

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

  // ================= CLEAR MESSAGES =================
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
      await interaction.deferReply({ ephemeral: true }); 
      const fetchedMessages = await channel.messages.fetch({ limit: amount });
      await channel.bulkDelete(fetchedMessages, true);
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

    if (!target) return interaction.reply({ content: "❌ User not found!", ephemeral: true });
    if (!target.kickable) return interaction.reply({ content: "❌ I cannot kick this user. They might have a higher role or I lack permissions.", ephemeral: true });
    if (target.id === interaction.user.id) return interaction.reply({ content: "❌ You cannot kick yourself!", ephemeral: true });
    if (target.id === client.user.id) return interaction.reply({ content: "❌ I cannot kick myself!", ephemeral: true });

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

  // ================= RUN CODE =================
  if (interaction.commandName === 'run') {
    // 1. Reply ephemerally so ONLY the user running it can see the code terminal
    await interaction.deferReply({ ephemeral: true });

    if (activeSessions.has(interaction.user.id)) {
      return interaction.editReply("❌ You already have a code running! Please wait for it to finish.");
    }

    let language = interaction.options.getString('language');
    let code = interaction.options.getString('code');
    const file = interaction.options.getAttachment('file');

    if (file) {
      const res = await axios.get(file.url);
      code = res.data;
    }

    if (code) code = code.replace(/\\n/g, '\n');
    if (!code) return interaction.editReply("❌ Provide code or upload a file.");

    const id = Date.now();
    let filePath = "";
    let compileCmd = null;
    let runCmd = "";
    let runArgs = [];

    try {
      // Setup file paths & execution commands based on language
      if (language === "python") {
        filePath = path.join(tempDir, `code_${id}.py`);
        fs.writeFileSync(filePath, code);
        runCmd = "python3";
        runArgs = [filePath];
      } else if (language === "javascript") {
        filePath = path.join(tempDir, `code_${id}.js`);
        fs.writeFileSync(filePath, code);
        runCmd = "node";
        runArgs = [filePath];
      } else if (language === "c") {
        filePath = path.join(tempDir, `code_${id}.c`);
        const exePath = path.join(tempDir, `code_${id}.out`);
        fs.writeFileSync(filePath, code);
        compileCmd = `gcc "${filePath}" -o "${exePath}"`;
        runCmd = exePath;
      } else if (language === "cpp") {
        filePath = path.join(tempDir, `code_${id}.cpp`);
        const exePath = path.join(tempDir, `code_${id}.out`);
        fs.writeFileSync(filePath, code);
        compileCmd = `g++ "${filePath}" -o "${exePath}"`;
        runCmd = exePath;
      } else if (language === "java") {
        const className = `Main_${id}`;
        filePath = path.join(tempDir, `${className}.java`);
        // Force the public class name to match the file name so Java compiler doesn't throw a fit
        code = code.replace(/public\s+class\s+[A-Za-z0-9_]+/g, `public class ${className}`);
        fs.writeFileSync(filePath, code);
        compileCmd = `javac "${filePath}"`;
        runCmd = "java";
        runArgs = ["-cp", tempDir, className];
      }

      // Compile if needed (C/C++/Java)
      if (compileCmd) {
        await interaction.editReply(`⚙️ Compiling ${language}...`);
        try {
          execSync(compileCmd, { stdio: 'pipe' });
        } catch (err) {
          return interaction.editReply(`❌ **Compilation Error:**\n\`\`\`\n${err.stderr.toString()}\n\`\`\``);
        }
      }

      // Spawn the live background process
      const child = spawn(runCmd, runArgs);

      // Create interactive input button
      const inputButton = new ButtonBuilder()
        .setCustomId('send_code_input')
        .setLabel('⌨️ Send Input')
        .setStyle(ButtonStyle.Primary);
      const actionRow = new ActionRowBuilder().addComponents(inputButton);

      // Save user's active session
      activeSessions.set(interaction.user.id, {
        process: child,
        output: ""
      });

      // Function to update the discord message safely without rate limits
      let lastUpdate = Date.now();
      const updateMessage = async (isFinal = false) => {
        const session = activeSessions.get(interaction.user.id);
        if (!session) return;
        
        let displayOutput = session.output || "Waiting for output/input...";
        if (displayOutput.length > 1900) displayOutput = displayOutput.substring(displayOutput.length - 1900); // keep last 1900 chars

        const messageContent = `🖥️ **Live Terminal (${language})**\n\`\`\`\n${displayOutput}\n\`\`\``;
        
        try {
          if (isFinal) {
            await interaction.editReply({ content: messageContent + "\n✅ *Process finished.*", components: [] });
          } else if (Date.now() - lastUpdate > 1500) { // Update every 1.5s max to avoid API rate limits
            lastUpdate = Date.now();
            await interaction.editReply({ content: messageContent, components: [actionRow] });
          }
        } catch (e) {}
      };

      await updateMessage();

      // Listen to console output from the code
      child.stdout.on('data', (data) => {
        const session = activeSessions.get(interaction.user.id);
        if(session) { session.output += data.toString(); updateMessage(); }
      });

      child.stderr.on('data', (data) => {
        const session = activeSessions.get(interaction.user.id);
        if(session) { session.output += `[ERROR] ${data.toString()}`; updateMessage(); }
      });

      // When process finishes running
      child.on('close', (code) => {
        activeSessions.delete(interaction.user.id);
        updateMessage(true);
      });

      // Auto-kill process after 2 minutes so users don't freeze the Railway container with infinite while() loops
      setTimeout(() => {
        if (activeSessions.has(interaction.user.id)) {
          child.kill();
          const session = activeSessions.get(interaction.user.id);
          session.output += "\n⏳ [PROCESS KILLED: Time limit reached (2 minutes)]";
          updateMessage(true);
          activeSessions.delete(interaction.user.id);
        }
      }, 120000);

    } catch (err) {
      console.log(err);
      interaction.editReply("❌ Something went wrong starting the code.");
      activeSessions.delete(interaction.user.id);
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
    
    if (diff > 60000) { // Delete after 1 minute of inactivity
      channel.delete().catch(console.error);
      tempChannels.delete(channelId);
    }
  });
}, 30000);

// ================= EXPRESS SERVER (FOR RAILWAY HEALTH CHECK) =================
const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send("Bot is running securely on Railway!");
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Server running on port 3000");
});

// ================= LOGIN =================
client.login(process.env.TOKEN);
