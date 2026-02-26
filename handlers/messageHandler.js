const soundCommands = require('../commands/soundCommands');
const uploadCommands = require('../commands/uploadCommands');
const downloadCommands = require('../commands/downloadCommands');
const { getPrefix } = require('../utils/prefixStore');

async function handleMessage(message) {
    if (message.author.bot) return;

    try {
        const content = message.content;
        const prefix = getPrefix();

        // Upload Commands
        if (content === `${prefix}upload`) {
            await uploadCommands.handleUpload(message);
            return;
        }

        // Download Commands
        if (content === `${prefix}download`) {
            await downloadCommands.handleDownload(message);
            return;
        }

        // Upload via DM
        if (message.channel.isDMBased() && message.attachments.size > 0) {
            await uploadCommands.handleFileUpload(message);
            return;
        }

        // Help Commands
        if (content === `${prefix}help` || content === `${prefix}hilfe`) {
            await soundCommands.sendHelpMenu(message, 1);
            return;
        }

        // Stop Commands
        if (content === `${prefix}stop` || content === `${prefix}stopp`) {
            await soundCommands.handleStop(message);
            return;
        }

        // YouTube Stream Command
        if (content.startsWith(`${prefix}yt `) || content.startsWith(`${prefix}youtube `)) {
            const firstSpaceIndex = content.indexOf(' ');
            const url = firstSpaceIndex >= 0 ? content.substring(firstSpaceIndex + 1).trim() : '';
            await soundCommands.handleYouTubeCommand(message, url);
            return;
        }

        // Main Menu Commands
        if ([`${prefix}9`, prefix, `${prefix}nippel`, 'nippel'].includes(content)) {
            await soundCommands.sendMainMenu(message);
            return;
        }

        // Sound Commands
        const reservedCommands = [
            `${prefix}help`,
            `${prefix}hilfe`,
            `${prefix}stop`,
            `${prefix}stopp`,
            `${prefix}reset`,
            `${prefix}upload`,
            `${prefix}download`,
            `${prefix}9`,
            `${prefix}nippel`,
            `${prefix}yt`,
            `${prefix}youtube`
        ];
        if (content.startsWith(prefix) && !reservedCommands.includes(content)) {
            await soundCommands.handleSoundCommand(message, content);
        }

    } catch (error) {
        console.error('Fehler beim Verarbeiten der Nachricht:', error);
        if (!message.replied && message.channel) {
            const errorMsg = await message.channel.send({ content: "Ein Fehler ist aufgetreten. Bitte versuche es erneut.", allowedMentions: { parse: [] } });
            setTimeout(() => errorMsg.delete().catch(console.error), 3000);
        }
    }
}

module.exports = handleMessage;
