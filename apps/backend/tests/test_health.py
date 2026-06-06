from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_root_returns_service_info():
    r = client.get("/")
    assert r.status_code == 200
    body = r.json()
    assert body["service"] == "suraksha-ai"
    assert body["status"] == "ok"
    assert "version" in body


def test_health_returns_ok():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}
