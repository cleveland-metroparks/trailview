# TrailView MonoRepo

## Modules

- `docs` - Documentation
- `prisma` - Database schema with Prisma ORM
- `trailviewer` - Frontend client library for viewer
- `web` - Admin page and API

## Development Instructions

Unlike deployment which has all components in a single `docker-compose.yml` file, development is split up into setting up a database, running the `web` component in dev mode, and then running the background `process` component in a separate docker container.

First, make sure you are on a Linux environment (Ubuntu specifically) which may mean installing WSL on Windows. Instructions for this are found in the `web/README.md` file as well as instructions for setting up the database. Once you are done there, if you want to develop/run the background process for image uploading and processing, then follow the instructions in `process/README.md`.

## Deployment Instructions

The production environment should be a Linux system with docker installed.

Clone this repository and copy the `.env.example` and rename to `.env`.

Fill out the necessary information in the `.env`.

Start the containers with this command...

```bash
docker compose up --build -d
```

This will build the project with all necessary components, including database, and run it detached (in the background).

To stop it, run...

```bash
docker compose down
```

Note that this command must be run from the root directory of the repo.
