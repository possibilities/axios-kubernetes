FROM node:8.9.1-alpine

COPY . /app
WORKDIR /app
RUN yarn
