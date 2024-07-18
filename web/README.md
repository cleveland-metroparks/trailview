# TrailView Admin Site

This is the admin site for uploading and editing images

## Dev Instructions

Development and Deployment are meant to be on a Linux platform.

If you are using an IDE or VSCode, open the `web/` subdirectory as the main workspace folder.

### Set up Development Database

This assumes you have docker installed.

Navigate to `docker/dev-postgis` and run

```bash
docker compose up -d
```

This will run the database locally on port `5432`

### Edit `.env` file

Copy the `.env.example` to `.env` and then change fields as necessary.

### Build `trailviewer`

The `web/` component relies on the `trailviewer/` component as a local dependency. Navigate to `trailviewer/` and follow its build instructions then come back here. This will only need to be done once as on Linux, it will create a filesystem link to the build so changes will propagate.

### Install dependencies

Run `npm install`

### Run dev server

Run `npm run dev` to start the dev server.
