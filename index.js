const { Client, GatewayIntentBits, ChannelType, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

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

  // ================= MUTE & UNMUTE =================
  if (interaction.commandName === 'mute' || interaction.commandName === 'unmute') {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: "❌ You don't have permission!", ephemeral: true });
    }

    const target = interaction.options.getMember('name');
    
    if (!target) return interaction.reply("❌ User not found!");

    if (interaction.commandName === 'mute') {
      // Mutes for 28 days (Discord Max)
      await target.timeout(28 * 24 * 60 * 60 * 1000, "Muted by admin");
      await interaction.reply(`🔇 **${target.user.tag}** has been muted.`);
    } else {
      await target.timeout(null);
      await interaction.reply(`🔊 **${target.user.tag}** has been unmuted.`);
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
