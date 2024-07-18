FROM ubuntu:24.04

WORKDIR /setup
RUN apt-get update && apt-get upgrade -y
RUN apt-get install -y curl moreutils daemontools default-jdk
RUN curl -fsSL https://deb.nodesource.com/setup_20.x -o nodesource_setup.sh
RUN bash nodesource_setup.sh
RUN apt-get install -y nodejs

# setup pannellum
WORKDIR /app
RUN mkdir pannellum-metroparks
WORKDIR /app/pannellum-metroparks
COPY ./pannellum-metroparks ./
WORKDIR /app/pannellum-metroparks/utils/build
RUN ./build.sh

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

HEALTHCHECK CMD curl --fail http://localhost:3000 || exit 1

# run
RUN chmod +x ./docker/start.sh
CMD ["./docker/start.sh"]