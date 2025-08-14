import os
from fastapi.testclient import TestClient

# Ensure required environment variables for backend are set before importing
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "test_db")

import backend.server as server


class FakeInsertResult:
    def __init__(self, inserted_id):
        self.inserted_id = inserted_id


class FakeCursor:
    def __init__(self, data):
        self._data = data

    async def to_list(self, _):
        return self._data


class FakeStatusCollection:
    def __init__(self):
        self._data = []

    async def insert_one(self, document):
        self._data.append(document)
        return FakeInsertResult(document.get("id"))

    def find(self):
        return FakeCursor(self._data)


class FakeDB:
    def __init__(self):
        self.status_checks = FakeStatusCollection()


def get_test_client():
    server.db = FakeDB()
    return TestClient(server.app)


def test_root_endpoint():
    client = get_test_client()
    response = client.get("/api/")
    assert response.status_code == 200
    assert response.json() == {"message": "Hello World"}


def test_status_endpoints():
    client = get_test_client()
    payload = {"client_name": "tester"}
    post_resp = client.post("/api/status", json=payload)
    assert post_resp.status_code == 200
    assert post_resp.json()["client_name"] == payload["client_name"]

    list_resp = client.get("/api/status")
    assert list_resp.status_code == 200
    data = list_resp.json()
    assert len(data) == 1
    assert data[0]["client_name"] == payload["client_name"]
