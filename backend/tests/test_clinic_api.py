def test_health(client):
    resp = client.get("/api/v1/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok", "database": "ok"}


def test_clinic_info(client, seeded):
    resp = client.get("/api/v1/clinic-info")
    assert resp.status_code == 200
    body = resp.json()
    assert body["name"] == "RUA Skin & Hair Center"
    assert len(body["opening_hours"]) == 7
    assert not any(h["closed"] for h in body["opening_hours"])  # open every day, 10am-8pm


def test_clinic_info_missing_returns_structured_404(client):
    resp = client.get("/api/v1/clinic-info")
    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "not_found"


def test_branches_list_both_centres(client, seeded):
    branches = client.get("/api/v1/branches").json()
    assert [b["slug"] for b in branches] == ["ramamurthy-nagar", "indiranagar"]
    assert branches[1]["phone"] == "+91 70199 76689" and "Puttappa Layout" in branches[1]["address"]


def test_list_services_and_filter_by_department(client, seeded):
    all_services = client.get("/api/v1/services").json()
    assert len(all_services) == 45
    laser = client.get("/api/v1/services", params={"department": "laser-treatments"}).json()
    assert len(laser) == 4 and all(s["department"] == "laser-treatments" for s in laser)
    assert client.get("/api/v1/services", params={"department": "dental"}).status_code == 422


def test_get_service_and_404(client, seeded):
    first = client.get("/api/v1/services").json()[0]
    assert client.get(f"/api/v1/services/{first['id']}").json()["slug"] == first["slug"]
    assert client.get("/api/v1/services/99999").status_code == 404


def test_list_doctors_filtered_by_service_and_speciality(client, seeded):
    doctors = client.get("/api/v1/doctors").json()
    assert {d["slug"] for d in doctors} == {"dr-jatin-k-reddy", "dr-eshritha-c", "dr-jeevith-c-reddy"}
    assert all("medical-dermatology" in d["departments"] for d in doctors)
    services = client.get("/api/v1/services").json()
    transplant = next(s for s in services if s["department"] == "hair-transplant")
    by_service = client.get("/api/v1/doctors", params={"service_id": transplant["id"]}).json()
    assert [d["slug"] for d in by_service] == ["dr-jatin-k-reddy"]
    # A doctor appears under every speciality they take, not only their primary one.
    lasers = client.get("/api/v1/doctors", params={"department": "laser-treatments"}).json()
    assert {d["slug"] for d in lasers} == {"dr-jatin-k-reddy", "dr-eshritha-c"}


def test_get_doctor(client, seeded):
    doctor = client.get("/api/v1/doctors").json()[0]
    resp = client.get(f"/api/v1/doctors/{doctor['id']}")
    assert resp.status_code == 200
    assert resp.json()["full_name"] == doctor["full_name"] and resp.json()["fellowship"]
    assert client.get("/api/v1/doctors/99999").status_code == 404


def test_blog_pagination_category_and_detail(client, seeded, admin_headers):
    assert client.get("/api/v1/blog").json()["total"] == 0  # articles are written in the admin panel
    for i, category in enumerate(["Skin Care", "Skin Care", "Hair Care", "Lasers", "Hair Care"]):
        resp = client.post("/api/v1/admin/blog", headers=admin_headers, json={
            "slug": f"article-{i}", "title": f"Dermatologist guide number {i}", "category": category,
            "excerpt": "A short, practical guide from the clinic dermatologists.",
            "content": "## What to know\n\n" + "Sun protection matters every single day in Bengaluru. " * 20,
            "is_published": True,
        })
        assert resp.status_code == 201, resp.text
    page1 = client.get("/api/v1/blog", params={"page": 1, "page_size": 2}).json()
    assert page1["total"] == 5 and page1["pages"] == 3 and len(page1["items"]) == 2
    assert client.get("/api/v1/blog", params={"category": "Hair Care"}).json()["total"] == 2
    slug = page1["items"][0]["slug"]
    detail = client.get(f"/api/v1/blog/{slug}").json()
    assert detail["slug"] == slug and detail["content"]
    assert client.get("/api/v1/blog/does-not-exist").status_code == 404
    assert "Lasers" in client.get("/api/v1/blog/categories").json()


def test_contact_form_validation_and_success(client, db):
    bad = client.post("/api/v1/contact", json={"name": "A", "email": "nope", "subject": "Hi", "message": "short"})
    assert bad.status_code == 422
    fields = {d["field"] for d in bad.json()["error"]["details"]}
    assert {"name", "email", "subject", "message"} <= fields

    ok = client.post(
        "/api/v1/contact",
        json={"name": "Ravi Kumar", "email": "ravi@example.com", "phone": "", "subject": "Parking", "message": "Is there parking near the clinic?"},
    )
    assert ok.status_code == 201
