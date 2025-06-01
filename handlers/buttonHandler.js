const uploadCommands = require('../commands/uploadCommands');
const downloadCommands = require('../commands/downloadCommands');
const soundCommands = require('../commands/soundCommands');

async function handleButtonInteraction(interaction) {
    if (!interaction.isButton()) return;

    try {
        const customId = interaction.customId;

        // Upload Buttons
        if (customId.startsWith('upload_') || customId.startsWith('transfer_') || customId.startsWith('overwrite_')) {
            await uploadCommands.handleButtonInteraction(interaction);
            return;
        }

        // Download Buttons
        if (customId.startsWith('download_')) {
            await downloadCommands.handleButtonInteraction(interaction);
            return;
        }

        // Sound/Navigation Buttons
        await soundCommands.handleButtonInteraction(interaction);

    } catch (error) {
        console.error('Fehler beim Verarbeiten der Interaktion:', error);
        
        if (!interaction.replied && !interaction.deferred) {
            try {
                await interaction.reply({ content: 'Ein Fehler ist aufgetreten.', flags: 64 });
            } catch (e) {
                console.error('Konnte keine Fehlerantwort senden:', e);
            }
        }
    }
}

module.exports = handleButtonInteraction;