FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev

COPY . .

RUN mkdir -p /data/sounds /data/temp

ENV NODE_ENV=production
EXPOSE 3002

CMD ["node", "bot.js"]
