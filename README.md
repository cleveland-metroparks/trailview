# TrailView MonoRepo

## Modules

- `docs` - Documentation
- `prisma` - Database schema with Prisma ORM
- `trailviewer` - Frontend client library for viewer
- `web` - Admin page and API

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