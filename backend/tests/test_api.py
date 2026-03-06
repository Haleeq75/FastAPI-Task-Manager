from fastapi.testclient import TestClient


def _register_user(client: TestClient, email: str, password: str = "password123") -> None:
    response = client.post("/register", json={"email": email, "password": password})
    assert response.status_code == 201


def _auth_headers(client: TestClient, email: str, password: str = "password123") -> dict[str, str]:
    login_response = client.post("/login", json={"email": email, "password": password})
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_register_success_and_duplicate_failure(client: TestClient) -> None:
    payload = {"email": "alice@example.com", "password": "password123"}

    response = client.post("/register", json=payload)

    assert response.status_code == 201
    data = response.json()
    assert data["email"] == payload["email"]
    assert isinstance(data["id"], int)

    duplicate_response = client.post("/register", json=payload)

    assert duplicate_response.status_code == 400
    assert duplicate_response.json()["error"]["message"] == "Email is already registered"


def test_login_success_and_failure(client: TestClient) -> None:
    _register_user(client, email="bob@example.com")

    success = client.post("/login", json={"email": "bob@example.com", "password": "password123"})
    failed = client.post("/login", json={"email": "bob@example.com", "password": "wrongpassword"})

    assert success.status_code == 200
    success_data = success.json()
    assert "access_token" in success_data
    assert success_data["token_type"] == "bearer"

    assert failed.status_code == 401
    assert failed.json()["error"]["message"] == "Invalid email or password"


def test_unauthorized_task_access_is_blocked(client: TestClient) -> None:
    response = client.get("/tasks")

    assert response.status_code == 401
    assert response.json()["error"]["message"] == "Not authenticated"


def test_task_crud_flow(client: TestClient) -> None:
    _register_user(client, email="crud@example.com")
    headers = _auth_headers(client, email="crud@example.com")

    create_one = client.post("/tasks", json={"title": "Task 1", "description": "First"}, headers=headers)
    create_two = client.post("/tasks", json={"title": "Task 2", "description": "Second"}, headers=headers)

    assert create_one.status_code == 201
    assert create_two.status_code == 201

    task_one = create_one.json()
    task_two = create_two.json()

    list_response = client.get("/tasks", headers=headers)
    assert list_response.status_code == 200
    listed_ids = {task["id"] for task in list_response.json()}
    assert listed_ids == {task_one["id"], task_two["id"]}

    get_response = client.get(f"/tasks/{task_one['id']}", headers=headers)
    assert get_response.status_code == 200
    assert get_response.json()["title"] == "Task 1"

    update_response = client.put(
        f"/tasks/{task_one['id']}",
        json={"title": "Task 1 Updated", "completed": True},
        headers=headers,
    )
    assert update_response.status_code == 200
    updated = update_response.json()
    assert updated["title"] == "Task 1 Updated"
    assert updated["completed"] is True

    delete_response = client.delete(f"/tasks/{task_two['id']}", headers=headers)
    assert delete_response.status_code == 204

    get_deleted = client.get(f"/tasks/{task_two['id']}", headers=headers)
    assert get_deleted.status_code == 404
    assert get_deleted.json()["error"]["message"] == "Task not found"


def test_task_ownership_isolation_between_users(client: TestClient) -> None:
    _register_user(client, email="owner@example.com")
    _register_user(client, email="other@example.com")

    owner_headers = _auth_headers(client, email="owner@example.com")
    other_headers = _auth_headers(client, email="other@example.com")

    create_response = client.post(
        "/tasks",
        json={"title": "Owner Task", "description": "Private"},
        headers=owner_headers,
    )
    task_id = create_response.json()["id"]

    assert client.get(f"/tasks/{task_id}", headers=other_headers).status_code == 403
    assert client.put(f"/tasks/{task_id}", json={"title": "Hack"}, headers=other_headers).status_code == 403
    assert client.delete(f"/tasks/{task_id}", headers=other_headers).status_code == 403

    list_other = client.get("/tasks", headers=other_headers)
    assert list_other.status_code == 200
    assert list_other.json() == []


def test_pagination_and_completed_filter(client: TestClient) -> None:
    _register_user(client, email="filters@example.com")
    headers = _auth_headers(client, email="filters@example.com")

    task_ids = []
    for idx in range(5):
        created = client.post(
            "/tasks",
            json={"title": f"Task {idx}", "description": f"Description {idx}"},
            headers=headers,
        )
        assert created.status_code == 201
        task_ids.append(created.json()["id"])

    for task_id in task_ids[:2]:
        updated = client.put(f"/tasks/{task_id}", json={"completed": True}, headers=headers)
        assert updated.status_code == 200

    paginated = client.get("/tasks", params={"skip": 1, "limit": 2}, headers=headers)
    assert paginated.status_code == 200
    assert len(paginated.json()) == 2

    completed_only = client.get("/tasks", params={"completed": True}, headers=headers)
    incomplete_only = client.get("/tasks", params={"completed": False}, headers=headers)

    assert completed_only.status_code == 200
    assert incomplete_only.status_code == 200
    assert len(completed_only.json()) == 2
    assert len(incomplete_only.json()) == 3
    assert all(task["completed"] is True for task in completed_only.json())
    assert all(task["completed"] is False for task in incomplete_only.json())
