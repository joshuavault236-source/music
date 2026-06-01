const { SlashCommandBuilder } = require('discord.js');
const { checkVoiceChannel } = require('../../utils/voiceChannelCheck.js');
const { sendSuccessResponse, handleCommandError, safeDeferReply } = require('../../utils/responseHandler.js');
const { getLang } = require('../../utils/languageLoader');

const data = new SlashCommandBuilder()
  .setName("clear")
  .setDescription("Clear the entire queue");

module.exports = {
    data: data,
    run: async (client, interaction) => {
        try {
            const deferred = await safeDeferReply(interaction);
            if (!deferred && !interaction.deferred && !interaction.replied) return;
            
            const lang = await getLang(interaction.guildId);
            const t = lang.music.clear;

            const player = client.riffy.players.get(interaction.guildId);
            const check = await checkVoiceChannel(interaction, player);
            
            if (!check.allowed) {
                const reply = await interaction.editReply({
                    ...check.response,
                    fetchReply: true
                });
                setTimeout(() => reply.delete().catch(() => {}), 5000);
                return reply;
            }

            // Validate player
            if (!player || player.destroyed) {
                return await handleCommandError(
                    interaction,
                    new Error('Player not available'),
                    'clear',
                    (t.errors?.title || '## ❌ Error') + '\n\n' + (t.errors?.message || 'Player is not available. Please start playing a song first.')
                );
            }

            // Check if queue is already empty
            if (player.queue.length === 0) {
                return await sendSuccessResponse(
                    interaction,
                    '## 📄 Queue Already Empty\n\n' +
                    'The queue is already empty.\n' +
                    'Use `/play` to add songs to the queue.'
                );
            }

            // Store queue size before clearing
            const queueSize = player.queue.length;

            // Clear the queue
            player.queue.clear();

            return await sendSuccessResponse(
                interaction,
                t.success.title + '\n\n' +
                t.success.message.replace('{count}', queueSize) + '\n' +
                t.success.note
            );

        } catch (error) {
            const lang = await getLang(interaction.guildId).catch(() => ({ music: { clear: { errors: {} } } }));
            const t = lang.music?.clear?.errors || {};
            
            return await handleCommandError(
                interaction,
                error,
                'clear',
                (t.title || '## ❌ Error') + '\n\n' + (t.message || 'An error occurred while clearing the queue.\nPlease try again later.')
            );
        }
    }
};
