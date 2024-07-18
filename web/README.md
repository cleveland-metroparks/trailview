# TrailView Admin Site

This is the admin site for uploading and editing images

## Development Instructions

Development and Deployment are meant to be on a Linux platform, specifically Ubuntu.

If you are on Windows, please install [WSL](https://learn.microsoft.com/en-us/windows/wsl/install) with Ubuntu 22.04

Prerequisites include
 - Docker
 - NodeJS 20.x

Install Docker with these [instructions](https://docs.docker.com/engine/install/ubuntu/#install-using-the-repository).

Install NodeJS 20.x with these [instructions](https://github.com/nodesource/distributions?tab=readme-ov-file#using-ubuntu-nodejs-20).

Verify the correct version of NodeJS is installed by running `node --version` and you should get `v20.x`, this is very important that the right version is installed.

If you are using an IDE or VSCode, open the `web/` subdirectory as the main workspace folder.

### Set up Development Database

Navigate to `docker/dev-postgis` and run

```bash
docker compose up -d
```

This will run the database locally on port `5432`

### Edit `.env` file

Copy the `.env.example` to `.env` and then change fields as necessary. The database field will already match the credentials on the dev database so really the only things that need changed is the `TV_IMAGES_PATH` which is the local path where TrailView images are stored when they are uploaded. Make sure to select a path that is empty.

### Install dependencies

Run `npm run post-clone` which will build the `trailviewer` dependency and then install the rest of the dependencies from npm.

### Push Database Schema

To set up the new dev database, you will need to run `npx drizzle-kit push` to push the schema to the database. You will need to run this anytime you edit `db/schema.ts`.

### Run dev server

Run `npm run dev` to start the dev server.

### Image Uploading

The `web/` component will handle the API and web dashboard but a separate `process` component is needed for image uploading. For this, follow the instructions in the `process/` subdirectory.

### Making changes

Before every commit, I recommend running `npm run pre-commit` to format, lint, and check you code.

### Updating dependencies

Run `npx ncu -i` to interactively select and update dependencies.
