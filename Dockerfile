FROM node:alpine-16.0.0 AS dev-deps
WORKDIR /opt/build
COPY package.json package-lock.json ./
RUN npm ci --no-audit

FROM node:alpine AS prod-deps
WORKDIR /opt/app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --only prod

FROM dev-deps AS build
WORKDIR /opt/build
COPY ./ ./
RUN npm run build

FROM prod-deps AS app
WORKDIR /opt/app
COPY --from=build /opt/build/build/ ./
COPY migrations/ migrations/
COPY knexfile.js knexfile.js
COPY bot.config.json ./
ENTRYPOINT ["node", "src/index.js"]
