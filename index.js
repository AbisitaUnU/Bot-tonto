require("dotenv").config();
const path = require("path");
const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
  ChannelType
} = require("discord.js");

const { readJSON, writeJSON } = require("./store");

const EMBEDS_PATH = path.join(__dirname, "embeds.json");
const CONFIG_PATH = path.join(__dirname, "config.json");

function loadEmbeds() {
  return readJSON(EMBEDS_PATH, {});
}
function saveEmbeds(db) {
  writeJSON(EMBEDS_PATH, db);
}
function loadConfig() {
  return readJSON(CONFIG_PATH, {
    welcome: { channelId: null, embedName: null },
    leave: { channelId: null, embedName: null }
  });
}
function saveConfig(cfg) {
  writeJSON(CONFIG_PATH, cfg);
}

// --------- Variables tipo Mimu ---------
function buildContext(member) {
  const guild = member.guild;
  const owner = guild.ownerId ? `<@${guild.ownerId}>` : "";

  return {
    "{user}": `<@${member.id}>`,
    "{user_tag}": member.user.tag,
    "{user_name}": member.user.username,
    "{user_avatar}": member.displayAvatarURL({ extension: "png", size: 256 }),
    "{user_nick}": member.nickname ?? member.user.username,
    "{user_joindate}": member.joinedAt ? `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:F>` : "",

    "{server_name}": guild.name,
    "{server_icon}": guild.iconURL({ extension: "png", size: 256 }) ?? "",
    "{server_membercount}": `${guild.memberCount}`,
    "{server_owner}": owner
  };
}

function applyVars(str, ctx) {
  if (!str) return str;
  let out = String(str);
  for (const [k, v] of Object.entries(ctx)) out = out.split(k).join(v ?? "");
  return out;
}

// Validación rápida de color hex
function parseHexColor(input) {
  if (!input) return null;
  const s = input.trim();
  const m = s.match(/^#?([0-9a-fA-F]{6})$/);
  if (!m) return null;
  return parseInt(m[1], 16);
}

// --------- Construcción de embed ---------
function buildEmbedFromData(data, ctx) {
  const e = new EmbedBuilder();

  const color = parseHexColor(applyVars(data.color, ctx));
  if (color !== null) e.setColor(color);

  const title = applyVars(data.title, ctx);
  if (title) e.setTitle(title);

  const desc = applyVars(data.description, ctx);
  if (desc) e.setDescription(desc);

  // Author
  if (data.author) {
    const name = applyVars(data.author.name, ctx);
    const iconURL = applyVars(data.author.iconURL, ctx);
    if (name || iconURL) e.setAuthor({ name: name || "\u200b", iconURL: iconURL || undefined });
  }

  // Footer
  if (data.footer) {
    const text = applyVars(data.footer.text, ctx);
    const iconURL = applyVars(data.footer.iconURL, ctx);
    if (text || iconURL) e.setFooter({ text: text || "\u200b", iconURL: iconURL || undefined });
  }

  // Images
  const thumbnail = applyVars(data.thumbnail, ctx);
  if (thumbnail) e.setThumbnail(thumbnail);

  const image = applyVars(data.image, ctx);
  if (image) e.setImage(image);

  // Timestamp
  if (data.timestamp === true) e.setTimestamp(new Date());

  return e;
}

// --------- Componentes (botones) ---------
function editorButtons(name) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`emb:basic:${name}`).setLabel("Editar (basic)").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`emb:author:${name}`).setLabel("Autor").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`emb:footer:${name}`).setLabel("Footer").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`emb:images:${name}`).setLabel("Imágenes").setStyle(ButtonStyle.Secondary),
  );
}
function previewDeleteButtons(name) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`emb:preview:${name}`).setLabel("Vista previa").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`emb:delete:${name}`).setLabel("Borrar").setStyle(ButtonStyle.Danger),
  );
}

function modalBasic(name, data) {
  const m = new ModalBuilder().setCustomId(`modal:basic:${name}`).setTitle(`Editar: ${name}`);
  m.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId("title").setLabel("TITLE").setStyle(TextInputStyle.Short).setRequired(false).setValue(data.title ?? "")
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId("description").setLabel("DESCRIPTION").setStyle(TextInputStyle.Paragraph).setRequired(false).setValue(data.description ?? "")
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId("color").setLabel("HEX COLOR (#RRGGBB)").setStyle(TextInputStyle.Short).setRequired(false).setValue(data.color ?? "#5865F2")
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId("timestamp").setLabel("TIMESTAMP? (yes/no)").setStyle(TextInputStyle.Short).setRequired(false).setValue(data.timestamp ? "yes" : "no")
    )
  );
  return m;
}

function modalAuthor(name, data) {
  const m = new ModalBuilder().setCustomId(`modal:author:${name}`).setTitle(`Editar autor: ${name}`);
  const author = data.author ?? {};
  m.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId("author_name").setLabel("AUTHOR TEXT").setStyle(TextInputStyle.Short).setRequired(false).setValue(author.name ?? "")
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId("author_icon").setLabel("AUTHOR IMG (URL o {user_avatar})").setStyle(TextInputStyle.Short).setRequired(false).setValue(author.iconURL ?? "")
    )
  );
  return m;
}

function modalFooter(name, data) {
  const m = new ModalBuilder().setCustomId(`modal:footer:${name}`).setTitle(`Editar footer: ${name}`);
  const footer = data.footer ?? {};
  m.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId("footer_text").setLabel("FOOTER TEXT").setStyle(TextInputStyle.Short).setRequired(false).setValue(footer.text ?? "")
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId("footer_icon").setLabel("FOOTER IMG (URL o {server_icon})").setStyle(TextInputStyle.Short).setRequired(false).setValue(footer.iconURL ?? "")
    )
  );
  return m;
}

function modalImages(name, data) {
  const m = new ModalBuilder().setCustomId(`modal:images:${name}`).setTitle(`Editar imágenes: ${name}`);
  m.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId("thumbnail").setLabel("THUMBNAIL URL").setStyle(TextInputStyle.Short).setRequired(false).setValue(data.thumbnail ?? "")
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId("image").setLabel("IMAGE URL").setStyle(TextInputStyle.Short).setRequired(false).setValue(data.image ?? "")
    )
  );
  return m;
}

// --------- Cliente ---------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    // Necesario para bienvenidas/despedidas:
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Channel]
});

client.once("ready", () => {
  console.log(`✅ Listo como ${client.user.tag}`);
});

// --------- Autocomplete de nombres de embeds ---------
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isAutocomplete()) return;
  try {
    if (interaction.commandName !== "embed" && interaction.commandName !== "setwelcome" && interaction.commandName !== "setleave") return;

    const db = loadEmbeds();
    const focused = interaction.options.getFocused(true);
    if (!focused || focused.name !== "name") return;

    const names = Object.keys(db);
    const q = String(focused.value ?? "").toLowerCase();

    const filtered = names
      .filter(n => n.toLowerCase().includes(q))
      .slice(0, 25)
      .map(n => ({ name: n, value: n }));

    await interaction.respond(filtered);
  } catch {
    // no pasa nada si falla autocomplete
  }
});

// --------- Slash + botones + modals ---------
client.on("interactionCreate", async (interaction) => {
  try {
    // -------- SLASH: /embed --------
    if (interaction.isChatInputCommand() && interaction.commandName === "embed") {
      const sub = interaction.options.getSubcommand();
      const db = loadEmbeds();

      if (sub === "create") {
        const name = interaction.options.getString("name", true).trim();
        if (name.length > 16) return interaction.reply({ content: "❌ Máximo 16 caracteres.", ephemeral: true });
        if (name.includes(" ")) return interaction.reply({ content: "❌ El nombre no puede tener espacios.", ephemeral: true });
        if (db[name]) return interaction.reply({ content: "❌ Ya existe un embed con ese nombre.", ephemeral: true });

        db[name] = {
          title: "",
          description: "",
          color: "#5865F2",
          author: { name: "", iconURL: "" },
          footer: { text: "", iconURL: "" },
          thumbnail: "",
          image: "",
          timestamp: false
        };
        saveEmbeds(db);

        return interaction.reply({
          content: `✅ Embed creado: **${name}**`,
          components: [editorButtons(name), previewDeleteButtons(name)],
          ephemeral: true
        });
      }

      if (sub === "list") {
        const names = Object.keys(db);
        if (names.length === 0) return interaction.reply({ content: "No tienes embeds guardados todavía. Usa `/embed create`.", ephemeral: true });
        return interaction.reply({ content: `📦 Embeds guardados (${names.length}):\n• ` + names.map(n => `\`${n}\``).join("\n• "), ephemeral: true });
      }

      if (sub === "delete") {
        const name = interaction.options.getString("name", true);
        if (!db[name]) return interaction.reply({ content: "❌ No existe ese embed.", ephemeral: true });
        delete db[name];
        saveEmbeds(db);
        return interaction.reply({ content: `🗑️ Borrado: **${name}**`, ephemeral: true });
      }

      if (sub === "send") {
        const channel = interaction.options.getChannel("channel");
        const name = interaction.options.getString("name");

        const targetChannel = channel ?? interaction.channel;
        if (!targetChannel || targetChannel.type !== ChannelType.GuildText) {
          return interaction.reply({ content: "❌ Solo puedo enviar en canales de texto.", ephemeral: true });
        }

        const names = Object.keys(db);
        if (names.length === 0) return interaction.reply({ content: "❌ No tienes embeds guardados. Usa `/embed create`.", ephemeral: true });

        // si no dio nombre → menú
        if (!name) {
          const menu = new StringSelectMenuBuilder()
            .setCustomId("menu:sendembed")
            .setPlaceholder("Elige un embed para enviar")
            .addOptions(names.slice(0, 25).map(n => ({ label: n, value: n })));

          const row = new ActionRowBuilder().addComponents(menu);

          return interaction.reply({
            content: "Selecciona cuál embed quieres enviar:",
            components: [row],
            ephemeral: true
          });
        }

        if (!db[name]) return interaction.reply({ content: "❌ No existe ese embed.", ephemeral: true });

        const ctx = buildContext(interaction.member);
        const embed = buildEmbedFromData(db[name], ctx);

        await targetChannel.send({ embeds: [embed] });
        return interaction.reply({ content: `✅ Enviado **${name}** en ${targetChannel}.`, ephemeral: true });
      }
    }

    // -------- SLASH: /setwelcome --------
    if (interaction.isChatInputCommand() && interaction.commandName === "setwelcome") {
      const cfg = loadConfig();
      const sub = interaction.options.getSubcommand();

      if (sub === "channel") {
        const ch = interaction.options.getChannel("channel", true);
        cfg.welcome.channelId = ch.id;
        saveConfig(cfg);
        return interaction.reply({ content: `✅ Canal de bienvenida guardado: ${ch}`, ephemeral: true });
      }

      if (sub === "embed") {
        const name = interaction.options.getString("name", true);
        const db = loadEmbeds();
        if (!db[name]) return interaction.reply({ content: "❌ Ese embed no existe. Usa `/embed list`.", ephemeral: true });
        cfg.welcome.embedName = name;
        saveConfig(cfg);
        return interaction.reply({ content: `✅ Embed de bienvenida: **${name}**`, ephemeral: true });
      }

      if (sub === "test") {
        const db = loadEmbeds();
        if (!cfg.welcome.channelId || !cfg.welcome.embedName) {
          return interaction.reply({ content: "❌ Configura primero `/setwelcome channel` y `/setwelcome embed`.", ephemeral: true });
        }
        const ch = await interaction.guild.channels.fetch(cfg.welcome.channelId).catch(() => null);
        if (!ch) return interaction.reply({ content: "❌ No encuentro el canal configurado.", ephemeral: true });
        const data = db[cfg.welcome.embedName];
        if (!data) return interaction.reply({ content: "❌ El embed configurado ya no existe.", ephemeral: true });

        const ctx = buildContext(interaction.member);
        const embed = buildEmbedFromData(data, ctx);
        await ch.send({ embeds: [embed] });
        return interaction.reply({ content: `✅ Test enviado en ${ch}.`, ephemeral: true });
      }
    }

    // -------- SLASH: /setleave --------
    if (interaction.isChatInputCommand() && interaction.commandName === "setleave") {
      const cfg = loadConfig();
      const sub = interaction.options.getSubcommand();

      if (sub === "channel") {
        const ch = interaction.options.getChannel("channel", true);
        cfg.leave.channelId = ch.id;
        saveConfig(cfg);
        return interaction.reply({ content: `✅ Canal de despedida guardado: ${ch}`, ephemeral: true });
      }

      if (sub === "embed") {
        const name = interaction.options.getString("name", true);
        const db = loadEmbeds();
        if (!db[name]) return interaction.reply({ content: "❌ Ese embed no existe. Usa `/embed list`.", ephemeral: true });
        cfg.leave.embedName = name;
        saveConfig(cfg);
        return interaction.reply({ content: `✅ Embed de despedida: **${name}**`, ephemeral: true });
      }

      if (sub === "test") {
        const db = loadEmbeds();
        if (!cfg.leave.channelId || !cfg.leave.embedName) {
          return interaction.reply({ content: "❌ Configura primero `/setleave channel` y `/setleave embed`.", ephemeral: true });
        }
        const ch = await interaction.guild.channels.fetch(cfg.leave.channelId).catch(() => null);
        if (!ch) return interaction.reply({ content: "❌ No encuentro el canal configurado.", ephemeral: true });
        const data = db[cfg.leave.embedName];
        if (!data) return interaction.reply({ content: "❌ El embed configurado ya no existe.", ephemeral: true });

        const ctx = buildContext(interaction.member);
        const embed = buildEmbedFromData(data, ctx);
        await ch.send({ embeds: [embed] });
        return interaction.reply({ content: `✅ Test enviado en ${ch}.`, ephemeral: true });
      }
    }

    // -------- MENÚ: enviar embed --------
    if (interaction.isStringSelectMenu() && interaction.customId === "menu:sendembed") {
      const name = interaction.values[0];
      const db = loadEmbeds();
      if (!db[name]) return interaction.reply({ content: "❌ Ese embed ya no existe.", ephemeral: true });

      const ctx = buildContext(interaction.member);
      const embed = buildEmbedFromData(db[name], ctx);

      await interaction.channel.send({ embeds: [embed] });
      return interaction.reply({ content: `✅ Enviado **${name}** aquí mismo.`, ephemeral: true });
    }

    // -------- BOTONES --------
    if (interaction.isButton()) {
      const [prefix, action, name] = interaction.customId.split(":");
      if (prefix !== "emb") return;

      const db = loadEmbeds();
      const data = db[name];
      if (!data) return interaction.reply({ content: "❌ Ese embed ya no existe.", ephemeral: true });

      if (action === "preview") {
        const ctx = buildContext(interaction.member);
        const embed = buildEmbedFromData(data, ctx);
        return interaction.reply({
          content: `👀 Vista previa: **${name}**`,
          embeds: [embed],
          components: [editorButtons(name), previewDeleteButtons(name)],
          ephemeral: true
        });
      }

      if (action === "delete") {
        delete db[name];
        saveEmbeds(db);
        return interaction.reply({ content: `🗑️ Borrado: **${name}**`, ephemeral: true });
      }

      if (action === "basic") return interaction.showModal(modalBasic(name, data));
      if (action === "author") return interaction.showModal(modalAuthor(name, data));
      if (action === "footer") return interaction.showModal(modalFooter(name, data));
      if (action === "images") return interaction.showModal(modalImages(name, data));
    }

    // -------- MODALS --------
    if (interaction.isModalSubmit()) {
      const [prefix, kind, name] = interaction.customId.split(":");
      if (prefix !== "modal") return;

      const db = loadEmbeds();
      const data = db[name];
      if (!data) return interaction.reply({ content: "❌ Ese embed ya no existe.", ephemeral: true });

      if (kind === "basic") {
        data.title = interaction.fields.getTextInputValue("title") ?? "";
        data.description = interaction.fields.getTextInputValue("description") ?? "";
        data.color = interaction.fields.getTextInputValue("color") ?? "#5865F2";
        const ts = (interaction.fields.getTextInputValue("timestamp") ?? "").trim().toLowerCase();
        data.timestamp = (ts === "yes" || ts === "si" || ts === "sí" || ts === "true" || ts === "1");
      }

      if (kind === "author") {
        data.author = data.author ?? { name: "", iconURL: "" };
        data.author.name = interaction.fields.getTextInputValue("author_name") ?? "";
        data.author.iconURL = interaction.fields.getTextInputValue("author_icon") ?? "";
      }

      if (kind === "footer") {
        data.footer = data.footer ?? { text: "", iconURL: "" };
        data.footer.text = interaction.fields.getTextInputValue("footer_text") ?? "";
        data.footer.iconURL = interaction.fields.getTextInputValue("footer_icon") ?? "";
      }

      if (kind === "images") {
        data.thumbnail = interaction.fields.getTextInputValue("thumbnail") ?? "";
        data.image = interaction.fields.getTextInputValue("image") ?? "";
      }

      db[name] = data;
      saveEmbeds(db);

      return interaction.reply({
        content: `✅ Guardado: **${name}**`,
        components: [editorButtons(name), previewDeleteButtons(name)],
        ephemeral: true
      });
    }
  } catch (err) {
    console.error(err);
    // evita “La aplicación no ha respondido”
    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
      try {
        await interaction.reply({ content: "❌ Ocurrió un error (mira la terminal).", ephemeral: true });
      } catch {}
    }
  }
});

// --------- Bienvenida / Despedida ---------
client.on("guildMemberAdd", async (member) => {
  const cfg = loadConfig();
  if (!cfg.welcome.channelId || !cfg.welcome.embedName) return;

  const db = loadEmbeds();
  const data = db[cfg.welcome.embedName];
  if (!data) return;

  const ch = await member.guild.channels.fetch(cfg.welcome.channelId).catch(() => null);
  if (!ch || ch.type !== ChannelType.GuildText) return;

  const ctx = buildContext(member);
  const embed = buildEmbedFromData(data, ctx);
  await ch.send({ embeds: [embed] }).catch(() => {});
});

client.on("guildMemberRemove", async (member) => {
  const cfg = loadConfig();
  if (!cfg.leave.channelId || !cfg.leave.embedName) return;

  const db = loadEmbeds();
  const data = db[cfg.leave.embedName];
  if (!data) return;

  const ch = await member.guild.channels.fetch(cfg.leave.channelId).catch(() => null);
  if (!ch || ch.type !== ChannelType.GuildText) return;

  // member aquí a veces no tiene joinedAt/ nickname si Discord no lo trae, pero igual sirve.
  const ctx = buildContext(member);
  const embed = buildEmbedFromData(data, ctx);
  await ch.send({ embeds: [embed] }).catch(() => {});
});

client.login(process.env.TOKEN);
