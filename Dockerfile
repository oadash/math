# Сборка без «залипшего» слоя Nixpacks: каждый деплой копирует актуальный server/.
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY server/package.json server/package.json
COPY client/package.json client/package.json

RUN npm ci

COPY server server
COPY client client
COPY railway.toml ./

RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["npm", "run", "start"]
