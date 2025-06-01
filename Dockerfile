FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

# Kopiere alle Dateien - constants.js ist jetzt in utils/ und wird automatisch mitkopiert
COPY . .

# Kopiere die Beispieldateien in die entsprechenden Konfigurationsdateien
RUN mkdir -p config && \
    cp config/config.example.json config/config.json && \
    cp config/soundCounts.example.json config/soundCounts.json

# Erstelle den `sounds`-Ordner (falls nicht vorhanden)
RUN mkdir -p sounds

CMD ["npm", "start"]