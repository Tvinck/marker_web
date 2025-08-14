# Marker Web

## Project Structure
- `backend/` – FastAPI application providing the API.
- `frontend/` – React application built with Tailwind CSS.
- `tests/` – automated backend tests.

## Requirements
- **Python** 3.11+
- **Node.js** 18+ with **Yarn**
- **MongoDB** 6+

## Backend Setup
1. Copy `backend/.env.example` to `backend/.env` and fill in the variables.
2. Create a virtual environment and install dependencies:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```
3. Run the development server:
   ```bash
   python backend/server.py
   # or
   uvicorn backend.server:app --reload
   ```

## Frontend Setup
1. Install dependencies:
   ```bash
   cd frontend
   yarn install
   ```
2. Build production assets:
   ```bash
   yarn build
   ```

## Tests
### Backend
Run the Python tests from the repository root:
```bash
pytest
```

### Frontend
Execute component tests from the `frontend` folder:
```bash
cd frontend
yarn test --watchAll=false
```

## Docker Compose
1. Build and start all services:
   ```bash
   docker-compose up --build
   ```
   - Backend API: http://localhost:8000
   - Frontend UI: http://localhost:3000
   - MongoDB: mongodb://localhost:27017 (data stored in `mongo-data` volume)
2. Stop the containers:
   ```bash
   docker-compose down
   ```

## Deployment
1. Ensure the host has Python, Node.js, and MongoDB installed.
2. Configure `backend/.env` with the production MongoDB connection and other settings.
3. Build the frontend with `yarn build` and serve the `frontend/build` directory via a static file server or CDN.
4. Run the backend with a process manager or container, e.g.:
   ```bash
   uvicorn backend.server:app --host 0.0.0.0 --port 8000
   ```
5. Configure reverse proxy (e.g., Nginx) to route API requests to the backend and serve the frontend build.
