FROM node:20-slim AS base

COPY . /app
WORKDIR /app

RUN yarn install

CMD [ "yarn", "start" ]