FROM node:22.13.1-bullseye AS base

COPY . /app
WORKDIR /app

RUN apt update && apt install -y libvips-dev

RUN npm install -g pnpm && pnpm install

CMD [ "pnpm", "start" ]