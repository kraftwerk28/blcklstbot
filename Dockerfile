FROM node:alpine AS base-image
ENV DEPS="make gcc g++ python3 postgresql-dev"
RUN echo $DEPS
RUN apk add --no-cache $DEPS
RUN npm install -g node-gyp

FROM base-image AS dev-deps
WORKDIR /opt/build
COPY package.json package-lock.json ./
RUN npm ci --no-audit

FROM base-image AS prod-deps
WORKDIR /opt/app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --only prod

FROM dev-deps AS build
WORKDIR /opt/build
COPY ./ ./
RUN npm run build

FROM prod-deps AS app
WORKDIR /opt/app
COPY --from=build /opt/build/dist/ ./
COPY bot.config.json ./
RUN echo $DEPS
RUN apk del $DEPS
RUN npm uninstall -g node-gyp
CMD [ "node", "./" ]
