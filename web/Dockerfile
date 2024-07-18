FROM ubuntu:24.04

WORKDIR /setup
RUN apt-get update && apt-get upgrade -y
RUN apt-get install -y curl moreutils daemontools
RUN curl -fsSL https://deb.nodesource.com/setup_20.x -o nodesource_setup.sh
RUN bash nodesource_setup.sh
RUN apt-get install -y nodejs

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
RUN mkdir logs

# env
ENV BODY_SIZE_LIMIT=Infinity
ENV PORT=3000
EXPOSE 3000

# run
RUN chmod +x ./docker/start.sh
CMD ["./docker/start.sh"]