 const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('Bot Policía activo 24/7 🚓'));
app.listen(PORT, () => {
  console.log(`Servidor web activado en el puerto ${PORT}`);
});

const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ChannelType, 
    ThreadAutoArchiveDuration 
} = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ]
});

// Coloca tu Token de Discord aquí
const TOKEN = 'MTUzNTg4OTI2OTA0MDg3MzU4Mw.GsDCHG.wiZhPPVXrVHiAe_vPWjktQLhBFd7BWYJRtKQzk';
// ID del canal donde llegarán las postulaciones para revisiones
const CANAL_REVISIONES_ID = '1536124979601604638';

// Lista de preguntas
const PREGUNTAS = [
    '**Pregunta 1:** ¿Cuál es tu nombre de usuario de Roblox?',
    '**Pregunta 2:** ¿Cuál es tu nombre completo tal como figura en tu DNI?',
    '**Pregunta 3:** ¿Cuál es tu fecha de nacimiento?',
    '**Pregunta 4:** ¿Por qué deseas unirte a la Policía Federal?',
    '**Pregunta 5:** ¿Qué harías si un individuo se pone agresivo y se niega rotundamente a seguir las indicaciones o pasos que le das?',
    '**Pregunta 6:** Si observas a un vehículo sospechoso merodeando una zona restringida sin placas o con actitud evasiva, ¿cuál sería tu procedimiento paso a paso?',
    '**Pregunta 7:** ¿Qué harías si ves a un compañero de la facción rompiendo la normativa del servidor o abusando de su poder?'
];

// Función para ELIMINAR el hilo directamente sin dejar rastro
async function eliminarHiloDirecto(thread) {
    try {
        if (thread && thread.isThread()) {
            await thread.delete();
        }
    } catch (error) {
        // El hilo probablemente ya fue eliminado manualmente
    }
}

client.once('clientReady', () => {
    console.log(`🤖 Bot conectado exitosamente como ${client.user.tag}`);
});

// 1. Comando para enviar el cuadro informativo inicial con el botón
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (message.content === '!setup-postulacion') {
        const embed = new EmbedBuilder()
            .setTitle('🚔 Postulaciones - Policía Federal')
            .setDescription(
                'Bienvenido al sistema de selección de la **Policía Federal**.\n\n' +
                'La Policía Federal se encarga de velar por la seguridad nacional y mantener el orden público en el servidor.\n\n' +
                '**Requisitos mínimos:**\n' +
                '• Tener paciencia y ser activo.\n' +
                '• Conocer la normativa general y policial.\n' +
                '• Responder el cuestionario con total sinceridad.\n\n' +
                'Haz clic en el botón de abajo para iniciar tu formulario paso a paso.'
            )
            .setColor(0x0055FF)
            .setFooter({ text: 'Sistema de Postulaciones Automático' });

        const boton = new ButtonBuilder()
            .setCustomId('iniciar_postulacion_pf')
            .setLabel('📋 Iniciar Postulación')
            .setStyle(ButtonStyle.Primary);

        const fila = new ActionRowBuilder().addComponents(boton);

        await message.channel.send({
            embeds: [embed],
            components: [fila]
        });

        if (message.deletable) message.delete();
    }
});

// 2. Manejador de interacciones
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    // --- INICIAR POSTULACIÓN ---
    if (interaction.customId === 'iniciar_postulacion_pf') {
        const usuario = interaction.user;
     await interaction.deferReply({ ephemeral: true });

        await interaction.editReply({
            content: '⏳ Creando tu hilo de postulación privado...',
            
        });

        try {
            const thread = await interaction.channel.threads.create({
                name: `postulacion-${usuario.username}`,
                autoArchiveDuration: ThreadAutoArchiveDuration.OneHour,
                type: ChannelType.PublicThread,
                reason: `Postulación a Policía Federal de ${usuario.tag}`,
            });

            await thread.members.add(usuario.id);

            const embedInicio = new EmbedBuilder()
                .setTitle(`📌 Postulación de ${usuario.username}`)
                .setDescription(
                    `Hola <@${usuario.id}>, bienvenido al proceso de selección de la **Policía Federal**.\n\n` +
                    `Este es un **hilo privado**. Iremos realizando **${PREGUNTAS.length} preguntas una por una**.\n` +
                    `Por favor, responde enviando un mensaje en este hilo a cada pregunta que se te solicite.\n\n` +
                    `¡Comenzamos!`
                )
                .setColor(0x00FF88);

            await thread.send({ embeds: [embedInicio] });
            await interaction.editReply({ content: `✅ ¡Postulación iniciada! Ve a tu hilo: ${thread}` });
            const respuestas = [];

            // Preguntas paso a paso
            for (let i = 0; i < PREGUNTAS.length; i++) {
                await thread.send(PREGUNTAS[i]);

                const filter = (m) => m.author.id === usuario.id;
                try {
                    const collected = await thread.awaitMessages({
                        filter,
                        max: 1,
                        time: 600000,
                        errors: ['time']
                    });

                    respuestas.push(collected.first().content);
                } catch (error) {
                    await thread.send(`⚠️ <@${usuario.id}>, se agotó el tiempo de respuesta. Eliminando postulación...`);
                    setTimeout(() => eliminarHiloDirecto(thread), 3000);
                    return;
                }
            }

            let resultadoTexto = '';
            for (let i = 0; i < PREGUNTAS.length; i++) {
                resultadoTexto += `${PREGUNTAS[i]}\n➔ **Respuesta:** ${respuestas[i]}\n\n`;
            }

            const embedFinalUsuario = new EmbedBuilder()
                .setTitle(`✅ Postulación Enviada - ${usuario.username}`)
                .setDescription(
                    `Has completado el cuestionario <@${usuario.id}>.\n\n` +
                    `Tu postulación ha sido enviada al **Alto Mando** para su revisión. ` +
                    `Recibirás la respuesta en este mismo hilo.`
                )
                .setColor(0x00FF88)
                .setTimestamp();

            await thread.send({ embeds: [embedFinalUsuario] });

            const canalRevisiones = interaction.guild.channels.cache.get(CANAL_REVISIONES_ID);
            if (canalRevisiones) {
                const embedRevision = new EmbedBuilder()
                    .setTitle(`📋 Nueva Postulación de ${usuario.tag}`)
                    .setThumbnail(usuario.displayAvatarURL({ dynamic: true }))
                    .setDescription(
                        `**Postulante:** <@${usuario.id}> (ID: \`${usuario.id}\`)\n` +
                        `**Hilo:** <#${thread.id}>\n\n` +
                        `__**Respuestas Cuestionario:**__\n\n` + resultadoTexto
                    )
                    .setColor(0x3498DB)
                    .setTimestamp();

                const btnAceptar = new ButtonBuilder()
                    .setCustomId(`aceptar_post_${usuario.id}_${thread.id}`)
                    .setLabel('Aceptar')
                    .setStyle(ButtonStyle.Success);

                const btnRechazar = new ButtonBuilder()
                    .setCustomId(`rechazar_post_${usuario.id}_${thread.id}`)
                    .setLabel('Rechazar')
                    .setStyle(ButtonStyle.Danger);

                const filaBotones = new ActionRowBuilder().addComponents(btnAceptar, btnRechazar);

                await canalRevisiones.send({
                    embeds: [embedRevision],
                    components: [filaBotones]
                });
            }

        } catch (error) {
            console.error(error);
        }
    }

    // --- ACEPTAR POSTULACIÓN ---
    if (interaction.customId.startsWith('aceptar_post_')) {
        const partes = interaction.customId.split('_');
        const usuarioId = partes[2];
        const threadId = partes[3];

        const embedOriginal = EmbedBuilder.from(interaction.message.embeds[0])
            .setColor(0x2ECC71)
            .setFooter({ text: `Aceptado por ${interaction.user.tag}` });

        await interaction.update({
            embeds: [embedOriginal],
            components: []
        });

        try {
            const thread = interaction.guild.channels.cache.get(threadId);

            if (thread) {
                const embedNotif = new EmbedBuilder()
                    .setTitle('🎉 ¡Postulación Aceptada!')
                    .setDescription(
                        `Felicidades <@${usuarioId}>, tu postulación para la **Policía Federal** ha sido **ACEPTADA** por <@${interaction.user.id}>.\n\n` +
                        `Ponte en contacto con un superior para coordinar la instrucción o rangos.\n\n` +
                        `📌 *Puedes presionar el botón de abajo para eliminar el hilo. De lo contrario, se eliminará automáticamente en 1 hora.*`
                    )
                    .setColor(0x2ECC71)
                    .setTimestamp();

                const btnCerrar = new ButtonBuilder()
                    .setCustomId('cerrar_y_borrar_hilo')
                    .setLabel('🗑️ Eliminar Hilo')
                    .setStyle(ButtonStyle.Danger);

                const filaCerrar = new ActionRowBuilder().addComponents(btnCerrar);

                await thread.send({ embeds: [embedNotif], components: [filaCerrar] });

                // Borrado automático en 1 hora si nadie presiona el botón
                setTimeout(() => {
                    eliminarHiloDirecto(thread);
                }, 3600000);
            }
        } catch (err) {
            console.error('Error al enviar mensaje al hilo:', err);
        }
    }

    // --- RECHAZAR POSTULACIÓN ---
    if (interaction.customId.startsWith('rechazar_post_')) {
        const partes = interaction.customId.split('_');
        const usuarioId = partes[2];
        const threadId = partes[3];

        const embedOriginal = EmbedBuilder.from(interaction.message.embeds[0])
            .setColor(0xE74C3C)
            .setFooter({ text: `Rechazado por ${interaction.user.tag}` });

        await interaction.update({
            embeds: [embedOriginal],
            components: []
        });

        try {
            const thread = interaction.guild.channels.cache.get(threadId);

            if (thread) {
                const embedNotif = new EmbedBuilder()
                    .setTitle('❌ Postulación Rechazada')
                    .setDescription(
                        `Hola <@${usuarioId}>, lamentamos informarte que tu postulación para la **Policía Federal** ha sido **RECHAZADA**.\n\n` +
                        `Puedes volver a intentarlo en una próxima convocatoria.\n\n` +
                        `📌 *Puedes presionar el botón de abajo para eliminar el hilo. De lo contrario, se eliminará automáticamente en 1 hora.*`
                    )
                    .setColor(0xE74C3C)
                    .setTimestamp();

                const btnCerrar = new ButtonBuilder()
                    .setCustomId('cerrar_y_borrar_hilo')
                    .setLabel('🗑️ Eliminar Hilo')
                    .setStyle(ButtonStyle.Danger);

                const filaCerrar = new ActionRowBuilder().addComponents(btnCerrar);

                await thread.send({ embeds: [embedNotif], components: [filaCerrar] });

                // Borrado automático en 1 hora si nadie presiona el botón
                setTimeout(() => {
                    eliminarHiloDirecto(thread);
                }, 3600000);
            }
        } catch (err) {
            console.error('Error al enviar mensaje al hilo:', err);
        }
    }

    // --- ELIMINAR HILO AL PRESIONAR EL BOTÓN ---
    if (interaction.customId === 'cerrar_y_borrar_hilo') {
        await interaction.reply({
            content: '🗑️ **Eliminando este hilo por completo en 3 segundos...**'
        });

        setTimeout(async () => {
            if (interaction.channel.isThread()) {
                await eliminarHiloDirecto(interaction.channel);
            }
        }, 3000);
    }
});

if (!TOKEN) {
    console.error("❌ ERROR CRÍTICO: No se encontró la variable TOKEN.");
} else {
    console.log("🔑 Intentando iniciar sesión con el TOKEN...");
    client.login(TOKEN)
        .then(() => console.log("🤖 ¡BOT CONECTADO EXITOSAMENTE!"))
        .catch(err => console.error("❌ ERROR AL CONECTAR EL BOT:", err));
}
