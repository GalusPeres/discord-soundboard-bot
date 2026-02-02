const { EmbedBuilder, ComponentType } = require('discord.js');

class EmbedUtils {
    createMenuComponents(title, extraComponents = [], description = null) {
        const normalizedExtras = this.normalizeComponents(extraComponents);
        const headerParts = [];
        const trimmedTitle = typeof title === 'string' ? title.trim() : '';
        if (trimmedTitle) {
            headerParts.push(trimmedTitle);
        }
        if (description) {
            headerParts.push(description);
        }
        const headerContent = headerParts.join('\n');
        const containerComponents = [];
        if (headerContent) {
            containerComponents.push({
                type: ComponentType.TextDisplay,
                content: headerContent
            });
        }
        if (normalizedExtras.length > 0) {
            if (containerComponents.length > 0) {
                containerComponents.push({ type: ComponentType.Separator });
            }
            containerComponents.push(...normalizedExtras);
        }
        if (containerComponents.length === 0) {
            return [];
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
            if (normalizedInner.length >= 1 && normalizedInner[0]?.type === ComponentType.TextDisplay) {
                return normalizedInner.slice(1);
            }
            return normalizedInner;
        }

        return this.normalizeComponents(components);
    }

    createErrorEmbed(title, description) {
        return new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle(`âŒ ${title}`)
            .setDescription(description);
    }

    createSuccessEmbed(title, description) {
        return new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle(`âœ… ${title}`)
            .setDescription(description);
    }

    createWarningEmbed(title, description) {
        return new EmbedBuilder()
            .setColor(0xFFAA00)
            .setTitle(`âš ï¸ ${title}`)
            .setDescription(description);
    }

    createInfoEmbed(title, description) {
        return new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle(`â„¹ï¸ ${title}`)
            .setDescription(description);
    }
}

module.exports = new EmbedUtils();
