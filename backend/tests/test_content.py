"""Admin content tools: image uploads, blog CMS, before/after gallery and the brand theme."""

import base64

# A real 1x1 PNG.
PNG = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==")

ARTICLE = {
    "slug": "managing-sensitive-teeth",
    "title": "Managing sensitive teeth at home",
    "excerpt": "Simple habits that ease tooth sensitivity, and when to see a dentist.",
    "content": "## Why teeth feel sensitive\n\n" + "Worn enamel exposes the dentine underneath. " * 60,
    "category": "Dental",
}


def test_image_upload_is_stored_and_served(client, staff_headers):
    resp = client.post("/api/v1/admin/media", files={"file": ("photo.png", PNG, "image/png")}, headers=staff_headers)
    assert resp.status_code == 201, resp.text
    url = resp.json()["url"]
    assert url.startswith("/api/v1/media/")
    image = client.get(url)
    assert image.status_code == 200 and image.content == PNG
    assert image.headers["content-type"] == "image/png" and "immutable" in image.headers["cache-control"]


def test_upload_checks_the_real_file_type(client, staff_headers):
    fake = client.post("/api/v1/admin/media", files={"file": ("x.png", b"<script>alert(1)</script>", "image/png")}, headers=staff_headers)
    assert fake.status_code == 422 and "JPEG, PNG, WebP or GIF" in fake.json()["error"]["message"]
    assert client.post("/api/v1/admin/media", files={"file": ("p.png", PNG, "image/png")}).status_code == 401


def test_blog_cms_drafts_publish_and_estimate_reading_time(client, seeded, admin_headers):
    draft = client.post("/api/v1/admin/blog", json={**ARTICLE, "is_published": False}, headers=admin_headers)
    assert draft.status_code == 201, draft.text
    post = draft.json()
    assert post["reading_minutes"] == 2  # 364 words at ~200 per minute
    assert client.get(f"/api/v1/blog/{ARTICLE['slug']}").status_code == 404  # drafts stay private

    published = client.put(f"/api/v1/admin/blog/{post['id']}", json={**ARTICLE, "is_published": True}, headers=admin_headers)
    assert published.status_code == 200
    assert client.get(f"/api/v1/blog/{ARTICLE['slug']}").json()["title"] == ARTICLE["title"]

    assert client.post("/api/v1/admin/blog", json=ARTICLE, headers=admin_headers).status_code == 409  # slug taken
    assert client.delete(f"/api/v1/admin/blog/{post['id']}", headers=admin_headers).status_code == 204


def test_only_admins_edit_the_blog(client, seeded, staff_headers):
    assert client.post("/api/v1/admin/blog", json=ARTICLE, headers=staff_headers).status_code == 403


def test_before_after_cases_need_consent_to_be_published(client, seeded, admin_headers):
    case = {
        "department": "dental",
        "title": "Clear aligner treatment",
        "before_image": "/api/v1/media/1",
        "after_image": "/api/v1/media/2",
        "is_published": True,
    }
    resp = client.post("/api/v1/admin/transformations", json=case, headers=admin_headers)
    assert resp.status_code == 422 and "consent" in str(resp.json()["error"]["details"])

    created = client.post("/api/v1/admin/transformations", json={**case, "patient_consent": True}, headers=admin_headers)
    assert created.status_code == 201
    hidden = client.post("/api/v1/admin/transformations", json={**case, "title": "Draft case", "is_published": False}, headers=admin_headers)
    assert hidden.status_code == 201

    public = client.get("/api/v1/transformations", params={"department": "dental"}).json()
    assert [c["title"] for c in public] == ["Clear aligner treatment"]
    assert "patient_consent" not in public[0]
    assert client.get("/api/v1/transformations", params={"department": "skin"}).json() == []


def test_theme_switch_is_public_and_admin_only(client, seeded, admin_headers, staff_headers):
    assert client.get("/api/v1/clinic-info").json()["theme"] == "cedar"
    assert client.put("/api/v1/admin/theme", json={"theme": "sapphire"}, headers=staff_headers).status_code == 403
    assert client.put("/api/v1/admin/theme", json={"theme": "neon"}, headers=admin_headers).status_code == 422
    assert client.put("/api/v1/admin/theme", json={"theme": "sapphire"}, headers=admin_headers).status_code == 200
    assert client.get("/api/v1/clinic-info").json()["theme"] == "sapphire"
