# TrailView Process

This component runs on the server and handles image uploading and processing.

## Development Instructions

Unlike the `web` component, there is no watch/dev mode for this. The easiest way to develop is to make the changes in code and then redeploy the docker container. If you wish to run it all locally, you will have to compile the C++ blurring code as well as setting up a virtual environment for the Python scripts. Instead of listing out the instructions for that here, you can find all the commands to do so in the `process/Dockerfile` to set things up that way.

To run the docker container, first set up the environment file by copying `.env.example` and rename it to `.env`. Fill it out as necessary making sure that the `TV_WEB_API_KEY` matched the same `TV_WEB_API_KEY` in the `web` component. The `TV_DOCKER_IMAGES_MOUNT_PATH` must match the `TV_IMAGES_PATH` in the `web` component as well. For the `TV_WEB_URL`, keep the `host.docker.internal` as the host as this corresponds to `localhost` on the host system as `localhost` is `localhost` in the container, not the host. Then run this command...

```bash
docker compose up
```

and press `ctrl+c` to stop it or...

```bash
docker compose down
```

in the same directory if you lose the terminal.

Every time you make a code change, simply restart the docker container.

Before every commit, I recommend running `npm run pre-commit` to format, lint, and check you code.

### Updating dependencies

Run `npx ncu -i` to interactively select and update dependencies.
