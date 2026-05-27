function serializeGuild(guild, userId = null) {
    if (!guild) return null;
    const voiceChannels = guild.channels.cache
        .filter((c) => c.type === 2)
        .map((c) => ({
            id: c.id,
            name: c.name,
            users: c.members ? c.members.size : 0,
            userLimit: c.userLimit || 0,
        }));
    return {
        id: guild.id,
        name: guild.name,
        icon: guild.iconURL ? guild.iconURL({ size: 128 }) : null,
        members: guild.memberCount,
        voiceChannels,
        userVoiceChannelId: userId ? (guild.voiceStates.cache.get(userId)?.channelId || null) : null,
    };
}

module.exports = { serializeGuild };
