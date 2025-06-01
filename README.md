# 🎵 Discord Soundboard Bot

Ein professioneller Discord Soundboard Bot mit interaktiven Menüs, Upload/Download-Features und umfassendem Logging.

## ✨ Features

### 🎶 Audio-System
- **Soundboard mit Button-Interface** - Interaktive Menüs mit Pagination
- **Top 10 Favoriten** - Automatisches Ranking basierend auf Nutzung
- **Neueste Sounds** - Zeigt zuletzt hinzugefügte Sounds
- **Zufalls-Sound** - Spielt einen zufälligen Sound ab
- **Cross-Channel Support** - Automatischer Channel-Wechsel

### 📁 File Management
- **Sound Upload via DM** - Sichere MP3-Uploads über private Nachrichten
- **Download-System** - Einzelne Sounds oder komplette Archive
- **Split-Archive** - Automatische Aufteilung großer Archive (10MB Discord-Limit)
- **Datei-Validierung** - MP3-Format und Größen-Checks

### 🔧 Administration
- **Robustes Connection-Management** - Automatische Wiederverbindung
- **Umfassendes Logging** - Detaillierte Logs für Debugging
- **State-Management** - Intelligente Zustandsverwaltung
- **Error-Handling** - Graceful Fehlerbehandlung

## 🚀 Installation

### Voraussetzungen
- Node.js 16.0.0 oder höher
- Discord Bot Token
- FFmpeg (für Audio-Processing)

### Setup

1. **Repository klonen**
   ```bash
   git clone https://github.com/yourusername/discord-soundboard-bot.git
   cd discord-soundboard-bot
   ```

2. **Dependencies installieren**
   ```bash
   npm install
   ```

3. **Konfiguration erstellen**
   ```bash
   cp config/config.example.json config/config.json
   ```

4. **Bot Token einsetzen**
   ```json
   {
     "token": "YOUR_DISCORD_BOT_TOKEN"
   }
   ```

5. **Bot starten**
   ```bash
   npm start
   ```

## 🎮 Commands

### Text Commands
- `8` oder `89` - Hauptmenü öffnen
- `8help` - Hilfe-Seite anzeigen
- `8upload` - Upload-Menü per DM
- `8download` - Download-Menü per DM
- `8stop` - Aktuellen Sound stoppen
- `8[soundname]` - Sound direkt abspielen

### Button Interface
- **A-Z Menü** - Alle Sounds alphabetisch sortiert
- **Top 10** - Meistgespielte Sounds
- **Neueste** - Zuletzt hinzugefügte Sounds
- **Navigation** - Vor/Zurück zwischen Seiten
- **Zufall** - Zufälligen Sound abspielen

## 📂 Projekt-Struktur

```
discord-soundboard-bot/
├── bot.js                 # Hauptdatei
├── package.json
├── config/
│   ├── config.json        # Bot-Konfiguration (nicht in Git)
│   ├── soundCounts.json   # Sound-Statistiken
│   └── sound_logs.txt     # Aktivitäts-Logs
├── commands/
│   ├── soundCommands.js   # Sound-Wiedergabe & Menüs
│   ├── uploadCommands.js  # Upload-System
│   └── downloadCommands.js # Download-System
├── handlers/
│   ├── messageHandler.js  # Text-Command Handler
│   └── buttonHandler.js   # Button-Interaction Handler
├── services/
│   ├── audioService.js    # Audio-Engine & Connection-Management
│   └── zipService.js      # Archive-Erstellung
├── utils/
│   ├── constants.js       # Konfiguration & URLs
│   ├── embedUtils.js      # Discord Embed-Utilities
│   ├── soundUtils.js      # Sound-Management
│   ├── stateManager.js    # Zustandsverwaltung
│   └── initialization.js  # Bot-Initialisierung
├── sounds/                # MP3-Dateien
└── temp/                  # Temporäre Dateien
```

## ⚙️ Konfiguration

### Audio-Einstellungen
```javascript
// utils/constants.js
MAX_FILE_SIZE: 10 * 1024 * 1024,    // 10MB Upload-Limit
MAX_FILENAME_LENGTH: 10,             // Maximale Länge für Sound-Namen
SOUNDS_PER_PAGE: 20,                 // Sounds pro Seite im A-Z Menü
```

### Bot-Berechtigungen

Der Bot benötigt folgende Discord-Permissions:
- `Send Messages` - Nachrichten senden
- `Use Slash Commands` - Interactions verwenden
- `Connect` - Voice Channel beitreten
- `Speak` - Audio abspielen
- `Use Voice Activity` - Voice-Aktivität

## 📊 Logging

Das System erstellt detaillierte Logs für:
- **Sound-Wiedergabe** - Wer hat welchen Sound gespielt
- **Connection-Events** - Voice Channel-Verbindungen
- **Upload/Download** - Datei-Operationen
- **Fehler** - Automatische Fehlerverfolgung

Logs werden gespeichert in:
- `config/sound_logs.txt` - Haupt-Aktivitäts-Log
- Console Output - Echtzeit-Debugging

## 🔧 Development

### Scripts
```bash
npm start     # Bot starten
npm run dev   # Development-Modus
npm test      # Tests ausführen (noch nicht implementiert)
```

### Code-Stil
- **Modulare Architektur** - Klare Trennung der Verantwortlichkeiten
- **Async/Await** - Moderne JavaScript-Patterns
- **Error-First** - Robuste Fehlerbehandlung
- **Logging-First** - Umfassende Debug-Informationen

## 🐛 Troubleshooting

### Häufige Probleme

**Bot verbindet sich nicht mit Voice Channel:**
```bash
# Überprüfe FFmpeg Installation
ffmpeg -version

# Überprüfe Bot-Berechtigungen
# Bot braucht 'Connect' und 'Speak' Permissions
```

**Sounds werden nicht gehört:**
```bash
# Überprüfe Console-Logs nach Connection-Fehlern
# Suche nach: [CONNECTION] TIMEOUT oder [AUDIO] AUTO_PAUSED
```

**Upload funktioniert nicht:**
```bash
# Überprüfe DM-Berechtigungen
# User muss DMs von Server-Mitgliedern erlauben
```

### Debug-Modus
Das ausführliche Logging zeigt jeden Schritt:
```
🎵 [SOUND] galusperes möchte "test" abspielen
✅ [CONNECTION] READY erhalten für "general" 
🚀 [AUDIO] Starte Wiedergabe: test
▶️ [AUDIO] Player Status: PLAYING
```

## 🤝 Contributing

1. Fork das Repository
2. Erstelle einen Feature-Branch (`git checkout -b feature/AmazingFeature`)
3. Committe deine Changes (`git commit -m 'Add AmazingFeature'`)
4. Push zum Branch (`git push origin feature/AmazingFeature`)
5. Öffne einen Pull Request

## 📝 License

Dieses Projekt ist unter der ISC License lizensiert. Siehe [LICENSE](LICENSE) für Details.

## 🙏 Credits

- **Discord.js** - Discord API Library
- **@discordjs/voice** - Audio-System
- **FFmpeg** - Audio-Processing
- **Node.js** - Runtime Environment

## 📞 Support

Bei Problemen oder Fragen:
1. Überprüfe die [Issues](https://github.com/yourusername/discord-soundboard-bot/issues)
2. Erstelle ein neues Issue mit detaillierter Beschreibung
3. Füge relevante Logs bei

---

**Made with ❤️ for Discord Communities**