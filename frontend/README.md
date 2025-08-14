# Marker Web Frontend

React interface for the Marker project.

## Backend API Dependency

The UI communicates with the FastAPI backend. Set the `REACT_APP_BACKEND_URL`
environment variable to the base URL of the backend (e.g., `http://localhost:8000`).
All API requests are made against `${REACT_APP_BACKEND_URL}/api`.

## Environment Variables

Create a `.env` file in this folder or define the variables in your shell.

- `REACT_APP_BACKEND_URL` – address of the backend API.

## Development

```bash
yarn install
yarn start
```

The app will be available on http://localhost:3000/.

## Building and Deployment

```bash
yarn build
```

The production files are generated in the `build` directory. Serve this directory with any
static file server and make sure `REACT_APP_BACKEND_URL` points to a running backend.

For details on the overall project structure and backend setup, see the [repository README](../README.md).
