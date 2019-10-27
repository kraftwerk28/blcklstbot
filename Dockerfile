FROM node:alpine
WORKDIR /opt/build
COPY package.json yarn.lock ./
RUN yarn install
COPY ./ ./
RUN yarn build

FROM node:alpine
WORKDIR /opt/app
COPY --from=0 /opt/build/dist/ ./
CMD node index.js
