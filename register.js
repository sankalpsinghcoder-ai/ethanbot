const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [

  // STUDY COMMAND (WITH SUBCOMMANDS FOR SEMESTERS)
  new SlashCommandBuilder()
    .setName('study')
    .setDescription('Get notes and PYQs for your semester')
    .addSubcommand(subcommand =>
      subcommand
        .setName('sem1')
        .setDescription('Get Semester 1 materials')
        .addStringOption(option =>
          option.setName('topic')
            .setDescription('Choose the material or subject')
            .setRequired(true)
            .addChoices(
              { name: '📁 Main Notes Folder', value: 'main' },
              { name: '📄 Previous Year Papers (PYQs)', value: 'pyq' },
              { name: '📘 Math', value: 'math' },
              { name: '📘 Fundamentals of Computer (FOC)', value: 'foc' },
              { name: '📘 C Programming', value: 'c' }
            )
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('sem2')
        .setDescription('Get Semester 2 materials')
        .addStringOption(option =>
          option.setName('topic')
            .setDescription('Choose the material or subject')
            .setRequired(true)
            .addChoices(
              { name: '📁 Main Notes Folder', value: 'main' },
              { name: '📄 Previous Year Papers (PYQs)', value: 'pyq' },
              { name: '📘 System Analysis & Design (SAD)', value: 'sad' },
              { name: '📘 Multimedia Tools (MMT)', value: 'mmt' },
              { name: '📘 Data Structures & Algo (DSA)', value: 'dsa' },
              { name: '📘 C++', value: 'cpp' }
            )
        )
    ),

  // CREATE CHANNEL
  new SlashCommandBuilder()
    .setName('create')
    .setDescription('Create a temporary channel')
    .addStringOption(option =>
      option.setName('name')
        .setDescription('Channel name')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('type')
        .setDescription('Channel type')
        .setRequired(true)
        .addChoices(
          { name: 'voice', value: 'voice' },
          { name: 'text', value: 'text' }
        )),

  // DELETE CHANNEL
  new SlashCommandBuilder()
  .setName('delete')
  .setDescription('Delete a temp channel'),

  // WHOIS
  new SlashCommandBuilder()
    .setName('whois')
    .setDescription('Get detailed info of a user')
    .addUserOption(option => 
      option.setName('name')
        .setDescription('Select a user')
        .setRequired(true)),

  // WARN
  new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Add or remove a warning (Admin Only)')
    .addSubcommand(subcmd => subcmd.setName('add').setDescription('Warn a user')
      .addUserOption(opt => opt.setName('name').setDescription('The user').setRequired(true)))
    .addSubcommand(subcmd => subcmd.setName('remove').setDescription('Remove a warning')
      .addUserOption(opt => opt.setName('name').setDescription('The user').setRequired(true))),


  // LOCK
  new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Lock the current channel (Admin Only)')
    .addStringOption(option => option.setName('timer').setDescription('Optional timer (e.g., 30m, 2h)')),

  // UNLOCK
  new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Unlock the current channel (Admin Only)'),


  // TEMPROLE
  new SlashCommandBuilder()
    .setName('temprole')
    .setDescription('Add or remove a role from a user (Admin Only)')
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Add a role to a user')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('The user to give the role to')
            .setRequired(true))
        .addRoleOption(option =>
          option.setName('role')
            .setDescription('The role to give')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove a role from a user')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('The user to remove the role from')
            .setRequired(true))
        .addRoleOption(option =>
          option.setName('role')
            .setDescription('The role to remove')
            .setRequired(true))),

  // DEL (CLEAR MESSAGES)
  new SlashCommandBuilder()
    .setName('del')
    .setDescription('Clear messages in the current channel (Admin Only)')
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription('Number of messages to delete (1-100, default 100)')
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(false)),

  // KICK
  new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a user from the server (Admin Only)')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to kick')
        .setRequired(true)),

  // RUN CODE
  new SlashCommandBuilder()
    .setName('run')
    .setDescription('Execute code in various languages')
    .addStringOption(option =>
      option.setName('language')
        .setDescription('Choose the programming language')
        .setRequired(true)
        .addChoices(
          { name: 'Python', value: 'python' },
          { name: 'JavaScript', value: 'javascript' },
          { name: 'C', value: 'c' },
          { name: 'C++', value: 'cpp' },
          { name: 'Java', value: 'java' }
        ))
    .addStringOption(option =>
      option.setName('code')
        .setDescription('The code to execute')
        .setRequired(false))
    .addAttachmentOption(option =>
      option.setName('file')
        .setDescription('Upload your code file')
        .setRequired(false)),

  // ROLE
  new SlashCommandBuilder()
  .setName('badge')
  .setDescription('Set your programming language badge')
  .addStringOption(option =>
    option.setName('language')
      .setDescription('Choose your badge')
      .setRequired(true)
      .addChoices(
        { name: 'Python', value: 'python' },
        { name: 'JavaScript', value: 'javascript' },
        { name: 'C', value: 'c' },
        { name: 'C++', value: 'cpp' },
        { name: 'Java', value: 'java' }
      )),

].map(cmd => cmd.toJSON());


const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);


rest.put(
  Routes.applicationGuildCommands('1484609251048554717', '1482119225643368450'),
  { body: commands }
).then(() => console.log("Commands registered ✅"))
  .catch(console.error);
