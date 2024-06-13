FROM ubuntu:24.04

WORKDIR /setup
RUN apt update && apt upgrade -y
RUN apt install -y python3 python3-venv build-essential meson curl libopencv-dev hugin-tools
RUN curl -fsSL https://deb.nodesource.com/setup_22.x -o nodesource_setup.sh
RUN bash nodesource_setup.sh
RUN apt install -y nodejs

WORKDIR /app
RUN mkdir -p ./scripts

WORKDIR /app/scripts
COPY ./scripts .

WORKDIR /app/scripts/blur360
RUN meson build
RUN meson configure build/ --buildtype release
RUN ninja -C build

WORKDIR /app/scripts
RUN python3 -m venv venv
ENV PATH="/app/scripts/venv/bin:$PATH"
RUN pip install -r requirements.txt

WORKDIR /app
COPY package*.json .
RUN npm ci
COPY . .
RUN npm run build

ENV PORT=3000
EXPOSE 3000

RUN chmod +x ./docker/start.sh
CMD ["./docker/start.sh"]



