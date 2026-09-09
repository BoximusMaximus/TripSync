FROM node:22-alpine AS build

WORKDIR /app

# the cypress binary (~200 MB) is never used inside the image - CI runs cypress on the runner
ENV CYPRESS_INSTALL_BINARY=0

COPY package*.json ./

RUN npm ci

COPY . .

# Build-time only: vite inlines VITE_* into the bundle, so the key has to be here when
# `npm run build` runs. .dockerignore drops every .env file from the context on purpose;
# docker-compose.prod.yml passes this arg (resolved from backend/.env by the Makefile).
ARG VITE_GOOGLE_MAPS_API_KEY

RUN npm run build

FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html

COPY nginx/default.conf /etc/nginx/conf.d/default.conf
