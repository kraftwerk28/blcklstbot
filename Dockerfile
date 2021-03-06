FROM node:16.0.0-alpine AS dev-deps
WORKDIR /opt/build
COPY package.json package-lock.json ./
RUN npm ci --no-audit --silent

FROM node:16.0.0-alpine AS prod-deps
WORKDIR /opt/app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --only prod --silent

FROM dev-deps AS build
WORKDIR /opt/build
COPY ./ ./
RUN npm run build

FROM prod-deps AS app
WORKDIR /opt/app
COPY --from=build /opt/build/build/ ./
COPY migrations/ migrations/
COPY locales/ locales/
COPY knexfile.js knexfile.js
COPY bot.config.json ./
ENTRYPOINT ["node", "src/index.js"]
