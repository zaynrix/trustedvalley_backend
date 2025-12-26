FROM node:18-alpine AS build
WORKDIR /app
COPY package.json .
COPY public ./public
COPY src ./src
RUN npm install --silent
RUN npm run build

FROM nginx:stable-alpine
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
