FROM node:20

# setup trailviewer package
WORKDIR /app
RUN mkdir trailviewer
WORKDIR /app/trailviewer
COPY ./trailviewer/package*.json ./
RUN npm ci
COPY ./trailviewer/ .
RUN npm run build

# setup web
RUN mkdir web
WORKDIR /app/web
COPY ./web/package*.json ./
RUN npm ci
COPY ./web/ .
RUN npm run build

# env
ENV PORT=3000
EXPOSE 3000

# run
RUN chmod +x ./docker/start.sh
CMD ["./docker/start.sh"]