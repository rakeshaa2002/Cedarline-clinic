def test_health(client):
    resp = client.get("/api/v1/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok", "database": "ok"}


def test_clinic_info(client, seeded):
    resp = client.get("/api/v1/clinic-info")
    assert resp.status_code == 200
    body = resp.json()
    assert body["name"] == "Cedarline Multispeciality Clinic"
    assert len(body["opening_hours"]) == 7
    assert body["opening_hours"][6]["closed"] is True


def test_clinic_info_missing_returns_structured_404(client):
    resp = client.get("/api/v1/clinic-info")
    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "not_found"


def test_list_services_and_filter_by_department(client, seeded):
    all_services = client.get("/api/v1/services").json()
    assert len(all_services) == 20
    dental = client.get("/api/v1/services", params={"department": "dental"}).json()
    assert dental and all(s["department"] == "dental" for s in dental)
    assert client.get("/api/v1/services", params={"department": "cardiology"}).status_code == 422


def test_get_service_and_404(client, seeded):
    first = client.get("/api/v1/services").json()[0]
    assert client.get(f"/api/v1/services/{first['id']}").json()["slug"] == first["slug"]
    assert client.get("/api/v1/services/99999").status_code == 404


def test_list_doctors_filtered_by_service(client, seeded):
    doctors = client.get("/api/v1/doctors").json()
    assert len(doctors) == 9
    hair_service = next(s for s in client.get("/api/v1/services").json() if s["department"] == "hair")
    hair_doctors = client.get("/api/v1/doctors", params={"service_id": hair_service["id"]}).json()
    assert {d["department"] for d in hair_doctors} == {"hair"}
    # General services can be provided by any department's doctor.
    general = next(s for s in client.get("/api/v1/services").json() if s["department"] == "general")
    assert len(client.get("/api/v1/doctors", params={"service_id": general["id"]}).json()) == 9


def test_get_doctor(client, seeded):
    doctor = client.get("/api/v1/doctors").json()[0]
    resp = client.get(f"/api/v1/doctors/{doctor['id']}")
    assert resp.status_code == 200
    assert resp.json()["full_name"] == doctor["full_name"]
    assert client.get("/api/v1/doctors/99999").status_code == 404


def test_blog_pagination_category_and_detail(client, seeded):
    page1 = client.get("/api/v1/blog", params={"page": 1, "page_size": 3}).json()
    assert page1["total"] == 8 and page1["pages"] == 3 and len(page1["items"]) == 3
    dental = client.get("/api/v1/blog", params={"category": "Dental"}).json()
    assert dental["total"] == 2
    slug = page1["items"][0]["slug"]
    detail = client.get(f"/api/v1/blog/{slug}").json()
    assert detail["slug"] == slug and detail["content"] and detail["author"]["full_name"].startswith("Dr.")
    assert client.get("/api/v1/blog/does-not-exist").status_code == 404
    assert "Dental" in client.get("/api/v1/blog/categories").json()


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
