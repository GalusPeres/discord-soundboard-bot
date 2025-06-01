const soundCommands = require('../commands/soundCommands');
const uploadCommands = require('../commands/uploadCommands');
const downloadCommands = require('../commands/downloadCommands');

async function handleMessage(message) {
    if (message.author.bot) return;

    try {
        const content = message.content;

        // Upload Commands
        if (content === '8upload') {
            await uploadCommands.handleUpload(message);
            return;
        }

        // Download Commands
        if (content === '8download') {
            await downloadCommands.handleDownload(message);
            return;
        }

        // Upload via DM
        if (message.channel.isDMBased() && message.attachments.size > 0) {
            await uploadCommands.handleFileUpload(message);
            return;
        }

        // Help Commands
        if (content === '8help' || content === '8hilfe') {
            await soundCommands.sendHelpMenu(message, 1);
            return;
        }

        // Stop Commands
        if (content === '8stop' || content === '8stopp') {
            await soundCommands.handleStop(message);
            return;
        }

        // Main Menu Commands
        if (['89', '8', '8nippel', 'nippel'].includes(content)) {
            await soundCommands.sendMainMenu(message);
            return;
        }

        // Sound Commands
        if (content.startsWith('8') && !['8help', '8hilfe', '8stop', '8stopp', '8reset', '8upload', '8download', '89', '8nippel'].includes(content)) {
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