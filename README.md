# Botboard Integration Note

This workspace version is configured through environment variables. Botboard
is optional: set `BOT_API_TOKEN` only when its HTTP API should be exposed to
the dashboard. In the container setup, persistent sound files are mounted
under `/data/sounds`; see `.env.example` for this container's variables.

# 🎵 Sound Files Directory

Dieses Verzeichnis enthält die MP3-Sound-Dateien für den Discord Soundboard Bot.

## 📁 Sound-Dateien hinzufügen

1. **Platziere deine MP3-Dateien hier:**
   ```
   sounds/
   ├── sound1.mp3
   ├── sound2.mp3
   ├── sound3.mp3
   └── ...
   ```

2. **Datei-Anforderungen:**
   - ✅ **Format:** MP3 
   - ✅ **Dateiname:** Max. 10 Zeichen (ohne .mp3)
   - ✅ **Größe:** Max. 10MB pro Datei
   - ✅ **Zeichen:** Nur a-z, 0-9 (keine Leerzeichen/Sonderzeichen)

3. **Beispiel-Dateien:**
   ```
   ✅ test.mp3
   ✅ hello.mp3  
   ✅ music123.mp3
   ❌ my sound.mp3 (Leerzeichen)
   ❌ verylongfilename.mp3 (zu lang)
   ❌ audio.wav (falsches Format)
   ```

## 🐳 Docker Usage

Bei Docker-Verwendung werden die Sounds automatisch gemountet:
```yaml
volumes:
  - ./sounds:/app/sounds
```

## 📤 Alternative: Upload via Bot

Du kannst auch Sounds über den Bot hochladen:
1. Schreibe `8upload` in Discord
2. Bot sendet dir eine DM
3. Lade deine MP3-Datei hoch
4. Bot speichert sie automatisch hier

## ⚠️ Wichtige Hinweise

- **Urheberrecht beachten:** Lade nur Sounds hoch, die du verwenden darfst
- **Git-Repository:** Sound-Dateien werden NICHT in Git gespeichert
- **Backup:** Sichere deine Sounds separat
- **Größe:** Viele große Dateien können die Performance beeinträchtigen

---

**Ready to rock! 🎸 Füge deine Sounds hinzu und starte den Bot!**
