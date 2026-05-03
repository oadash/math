# Сборка из корня монорепо. Railway передаёт ARG на этапе build (см. их доку про Dockerfile + variables).
FROM node:20-alpine

WORKDIR /app

ARG RAILWAY_GIT_COMMIT_SHA=missing_in_docker_build

COPY package.json package-lock.json ./
COPY server/package.json server/package.json
COPY client/package.json client/package.json

RUN npm ci

COPY server server
COPY client client
COPY railway.toml ./

RUN printf '%s\n' "$RAILWAY_GIT_COMMIT_SHA" > /app/BUILD_COMMIT.txt

# Публичный URL API для Vite (отдельный сервис на Railway). Задай Variable VITE_API_URL при сборке.
ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["npm", "run", "start"]
