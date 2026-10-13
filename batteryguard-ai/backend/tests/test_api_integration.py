import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database.session import Base, engine, SessionLocal
from app.services.seed import seed_database

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
    yield

@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c

def test_health_check(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_login_and_auth(client):
    login_resp = client.post("/api/auth/login", json={
        "email": "admin@batteryguard.ai",
        "password": "Admin@123456"
    })
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    assert token is not None

    me_resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == "admin@batteryguard.ai"

def test_batteries_api(client):
    login_resp = client.post("/api/auth/login", json={
        "email": "admin@batteryguard.ai",
        "password": "Admin@123456"
    })
    token = login_resp.json()["access_token"]

    resp = client.get("/api/batteries", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    batteries = resp.json()
    assert len(batteries) >= 5

def test_simulation_and_save_test(client):
    login_resp = client.post("/api/auth/login", json={
        "email": "admin@batteryguard.ai",
        "password": "Admin@123456"
    })
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Run simulation
    sim_resp = client.post("/api/tests/simulate?battery_id=1&profile_id=1&scenario=normal&duration_sec=15", headers=headers)
    assert sim_resp.status_code == 200
    sim_data = sim_resp.json()
    assert "analysis" in sim_data
    assert sim_data["analysis"]["screening_category"] in ("GOOD", "REVIEW", "DEGRADED", "CRITICAL")

    # Save test session
    save_payload = {
        "battery_id": 1,
        "profile_id": 1,
        "mode": "simulation",
        "scenario": "normal",
        "duration_sec": 15.0,
        "notes": "Integration test automated save",
        "readings": sim_data["readings"]
    }
    save_resp = client.post("/api/tests/save", json=save_payload, headers=headers)
    assert save_resp.status_code == 200
    saved_session = save_resp.json()
    assert saved_session["test_id"].startswith("TST-")

    # Verify PDF report generation for saved session
    pdf_resp = client.get(f"/api/reports/pdf/{saved_session['test_id']}", headers=headers)
    assert pdf_resp.status_code == 200
    assert pdf_resp.headers["content-type"] == "application/pdf"
    assert len(pdf_resp.content) > 1000

    # Verify CSV export
    csv_resp = client.get(f"/api/reports/csv/readings/{saved_session['test_id']}", headers=headers)
    assert csv_resp.status_code == 200
    assert "pack_voltage_v" in csv_resp.text
