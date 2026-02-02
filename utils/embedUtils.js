const { EmbedBuilder, ComponentType } = require('discord.js');
const stateManager = require('./stateManager');

class EmbedUtils {
    createStatusComponents(title, showIdleState = true, extraComponents = [], descriptionOverride = null) {
        let description;

        if (descriptionOverride) {
            description = descriptionOverride;
        } else if (showIdleState) {
            description = "Wähle einen Sound aus!";
        } else {
            const currentSound = stateManager.getCurrentPlayingFileName();
            description = `${currentSound} wird abgespielt...`;
        }

        const normalizedExtras = this.normalizeComponents(extraComponents);
        const trimmedTitle = typeof title === 'string' ? title.trim() : '';
        const headerContent = trimmedTitle ? `${trimmedTitle}\n${description}` : description;

        const containerComponents = [
            {
                type: ComponentType.TextDisplay,
                content: headerContent
            }
        ];

        if (normalizedExtras.length > 0) {
            containerComponents.push({ type: ComponentType.Separator }, ...normalizedExtras);
        }

        return [
            {
                type: ComponentType.Container,
                components: containerComponents
            }
        ];
    }

    normalizeComponents(components) {
        return (components ?? []).map(component =>
            typeof component?.toJSON === 'function' ? component.toJSON() : component
        );
    }

    getExtraComponentsFromMessage(message) {
        if (!message) {
            return [];
        }

        const components = message?.components ?? [];
        const container = components.find(component => component.type === ComponentType.Container);
        if (container) {
            const inner = container.components ?? container.data?.components ?? [];
            const normalizedInner = this.normalizeComponents(inner);

            if (
                normalizedInner.length >= 2 &&
                normalizedInner[0]?.type === ComponentType.TextDisplay &&
                normalizedInner[1]?.type === ComponentType.Separator
            ) {
                return normalizedInner.slice(2);
            }
            return normalizedInner.filter(component =>
                component.type === ComponentType.ActionRow || component.type === ComponentType.Separator
            );
        }

        return this.normalizeComponents(
            components.filter(component =>
                component.type === ComponentType.ActionRow || component.type === ComponentType.Separator
            )
        );
    }

    buildStatusComponentsFromMessage(title, showIdleState, message, descriptionOverride = null) {
        const extraComponents = this.getExtraComponentsFromMessage(message);
        return this.createStatusComponents(title, showIdleState, extraComponents, descriptionOverride);
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
