require("dotenv").config();
const { REST, Routes, SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require("discord.js");

const commands = [];

// /embed ...
const embedCmd =
  new SlashCommandBuilder()
    .setName("embed")
    .setDescription("Crear y editar embeds")
    .addSubcommand(sc =>
      sc.setName("create")
        .setDescription("Crear un embed guardado")
        .addStringOption(o => o.setName("name").setDescription("Nombre (sin espacios, max 16)").setRequired(true))
    )
    .addSubcommand(sc =>
      sc.setName("list")
        .setDescription("Ver lista de embeds guardados")
    )
    .addSubcommand(sc =>
      sc.setName("send")
        .setDescription("Enviar un embed guardado")
        .addStringOption(o =>
          o.setName("name").setDescription("Nombre del embed (si lo dejas vacío te sale un menú)").setAutocomplete(true)
        )
        .addChannelOption(o =>
          o.setName("channel").setDescription("Canal donde enviarlo (opcional)").addChannelTypes(ChannelType.GuildText)
        )
    )
    .addSubcommand(sc =>
      sc.setName("delete")
        .setDescription("Borrar un embed guardado")
        .addStringOption(o => o.setName("name").setDescription("Nombre").setRequired(true).setAutocomplete(true))
    );

commands.push(embedCmd);

// /setwelcome ...
const setWelcome =
  new SlashCommandBuilder()
    .setName("setwelcome")
    .setDescription("Configurar bienvenida")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sc =>
      sc.setName("channel")
        .setDescription("Canal de bienvenidas")
        .addChannelOption(o => o.setName("channel").setDescription("Canal").setRequired(true).addChannelTypes(ChannelType.GuildText))
    )
    .addSubcommand(sc =>
      sc.setName("embed")
        .setDescription("Embed guardado a usar en bienvenidas")
        .addStringOption(o => o.setName("name").setDescription("Nombre del embed").setRequired(true).setAutocomplete(true))
    )
    .addSubcommand(sc =>
      sc.setName("test")
        .setDescription("Probar bienvenida (solo tú)")
    );

commands.push(setWelcome);

// /setleave ...
const setLeave =
  new SlashCommandBuilder()
    .setName("setleave")
    .setDescription("Configurar despedida")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sc =>
      sc.setName("channel")
        .setDescription("Canal de despedidas")
        .addChannelOption(o => o.setName("channel").setDescription("Canal").setRequired(true).addChannelTypes(ChannelType.GuildText))
    )
    .addSubcommand(sc =>
      sc.setName("embed")
        .setDescription("Embed guardado a usar en despedidas")
        .addStringOption(o => o.setName("name").setDescription("Nombre del embed").setRequired(true).setAutocomplete(true))
    )
    .addSubcommand(sc =>
      sc.setName("test")
        .setDescription("Probar despedida (solo tú)")
    );

commands.push(setLeave);

(async () => {
  try {
    const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

    // comandos por servidor (más rápido para pruebas)
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands.map(c => c.toJSON()) }
    );

    console.log("✅ Comandos registrados en el servidor.");
  } catch (err) {
    console.error(err);
  }
})();
