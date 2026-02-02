const soundCommands = require('../commands/soundCommands');
const uploadCommands = require('../commands/uploadCommands');
const downloadCommands = require('../commands/downloadCommands');
const { PREFIX } = require('../utils/constants');

const prefix = PREFIX;

async function handleMessage(message) {
    if (message.author.bot) return;

    try {
        const content = message.content;

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

        // Main Menu Commands
        if ([`${prefix}9`, prefix, `${prefix}nippel`, 'nippel'].includes(content)) {
            await soundCommands.sendMainMenu(message);
            return;
        }

        // Sound Commands
        const reservedCommands = [`${prefix}help`, `${prefix}hilfe`, `${prefix}stop`, `${prefix}stopp`, `${prefix}reset`, `${prefix}upload`, `${prefix}download`, `${prefix}9`, `${prefix}nippel`];
        if (content.startsWith(prefix) && !reservedCommands.includes(content)) {
            await soundCommands.handleSoundCommand(message, content);
        }

    } catch (error) {
        console.error('Fehler beim Verarbeiten der Nachricht:', error);
        if (!message.replied) {
            const errorMsg = await message.reply("Ein Fehler ist aufgetreten. Bitte versuche es erneut.");
            setTimeout(() => errorMsg.delete().catch(console.error), 3000);
        }
    }
}

module.exports = handleMessage;