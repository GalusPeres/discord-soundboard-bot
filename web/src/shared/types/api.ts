export type GuildSummary = {
  id: string;
  name: string;
  iconUrl: string | null;
};

export type UserSummary = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
};

export type SessionResponse = {
  authenticated: boolean;
  user: UserSummary | null;
  guilds: GuildSummary[];
  selectedGuildId: string | null;
};

export type SoundItem = {
  name: string;
  fileName: string;
  sizeBytes: number;
  modifiedAt: string;
  playCount: number;
  isNew: boolean;
  isTop: boolean;
  previewUrl: string;
  downloadUrl: string;
};

export type SoundsResponse = {
  sounds: SoundItem[];
};
