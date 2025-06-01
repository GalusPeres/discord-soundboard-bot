const { EmbedBuilder } = require('discord.js');
const { PNG_URL, GIF_URL } = require('./constants');
const stateManager = require('./stateManager');

class EmbedUtils {
    createStatusEmbed(title, showIdleState = true) {
        let description;
        let thumbnailUrl = PNG_URL;

        if (showIdleState) {
            description = "Wähle einen Sound aus!";
        } else {
            const currentSound = stateManager.getCurrentPlayingFileName();
            description = `🔊 ${currentSound} wird abgespielt!`;
            thumbnailUrl = GIF_URL;
        }

        return new EmbedBuilder()
            .setColor(0x00AE86)
            .setTitle(title)
            .setDescription(description)
            .setThumbnail(thumbnailUrl);
    }

    createErrorEmbed(title, description) {
        return new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle(`❌ ${title}`)
            .setDescription(description);
    }

    createSuccessEmbed(title, description) {
        return new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle(`✅ ${title}`)
            .setDescription(description);
    }

    createWarningEmbed(title, description) {
        return new EmbedBuilder()
            .setColor(0xFFAA00)
            .setTitle(`⚠️ ${title}`)
            .setDescription(description);
    }

    createInfoEmbed(title, description) {
        return new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle(`ℹ️ ${title}`)
            .setDescription(description);
    }
}

module.exports = new EmbedUtils();