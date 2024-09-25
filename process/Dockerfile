FROM ubuntu:24.04

WORKDIR /setup
RUN apt-get update && apt-get upgrade -y
RUN apt-get install -y python3 python3-venv build-essential meson curl libopencv-dev hugin-tools moreutils daemontools ccache
RUN curl -fsSL https://deb.nodesource.com/setup_20.x -o nodesource_setup.sh
RUN bash nodesource_setup.sh
RUN apt-get install -y nodejs

WORKDIR /app/process
RUN mkdir -p ./scripts

WORKDIR /app/process/scripts
COPY ./scripts .

WORKDIR /app/process/scripts/blur360
RUN meson build
RUN meson configure build/ --buildtype release
RUN ninja -C build

WORKDIR /app/process/scripts
RUN python3 -m venv venv
ENV PATH="/app/process/scripts/venv/bin:$PATH"
RUN pip install -r requirements.txt

WORKDIR /app/process
COPY package*.json .
RUN npm ci
COPY . .
RUN npm run build
RUN mkdir logs

RUN chmod +x ./docker/start.sh
CMD ["./docker/start.sh"]



