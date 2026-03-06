const API_BASE_URL = (window.APP_CONFIG?.API_BASE_URL || "http://localhost:8000").replace(/\/$/, "");
const TOKEN_KEY = "task_manager_token";

const refs = {
  apiBaseUrl: document.getElementById("api-base-url"),
  backendStatus: document.getElementById("backend-status"),
  verifyBackendBtn: document.getElementById("verify-backend-btn"),
  registerForm: document.getElementById("register-form"),
  registerMessage: document.getElementById("register-message"),
  loginForm: document.getElementById("login-form"),
  loginMessage: document.getElementById("login-message"),
  logoutBtn: document.getElementById("logout-btn"),
  createTaskForm: document.getElementById("create-task-form"),
  createTaskMessage: document.getElementById("create-task-message"),
  refreshTasksBtn: document.getElementById("refresh-tasks-btn"),
  listTaskMessage: document.getElementById("list-task-message"),
  taskList: document.getElementById("task-list")
};

refs.apiBaseUrl.textContent = API_BASE_URL;

function setStatus(el, message, type = "") {
  el.textContent = message;
  el.className = `status ${type}`.trim();
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function apiFetch(path, options = {}, requiresAuth = false) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (requiresAuth) {
    const token = getToken();
    if (!token) {
      throw new Error("Please login first.");
    }
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    let details = response.statusText;
    try {
      const body = await response.json();
      details = body.error?.message || body.detail || JSON.stringify(body);
    } catch {
      // keep status text when no json body
    }
    throw new Error(details || "Request failed");
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

async function verifyBackend() {
  setStatus(refs.backendStatus, "Checking backend...");
  try {
    await apiFetch("/openapi.json", {}, false);
    setStatus(refs.backendStatus, "Connected successfully to backend base URL.", "success");
  } catch (error) {
    setStatus(refs.backendStatus, `Unable to reach backend: ${error.message}`, "error");
  }
}

async function registerUser(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const payload = {
    email: formData.get("username"),
    password: formData.get("password")
  };

  try {
    await apiFetch("/register", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    setStatus(refs.registerMessage, "Registration successful. You can now log in.", "success");
    refs.registerForm.reset();
  } catch (error) {
    setStatus(refs.registerMessage, error.message, "error");
  }
}

async function loginUser(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const payload = {
    email: formData.get("username"),
    password: formData.get("password")
  };

  try {
    const result = await apiFetch("/login", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    const token = result.access_token || result.token;
    if (!token) {
      throw new Error("Login succeeded but no token returned.");
    }

    setToken(token);
    setStatus(refs.loginMessage, "Login successful. JWT stored in localStorage.", "success");
    refs.loginForm.reset();
    await listTasks();
  } catch (error) {
    setStatus(refs.loginMessage, error.message, "error");
  }
}

async function createTask(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const payload = {
    title: formData.get("title"),
    description: formData.get("title")
  };

  try {
    await apiFetch("/tasks", {
      method: "POST",
      body: JSON.stringify(payload)
    }, true);
    setStatus(refs.createTaskMessage, "Task created.", "success");
    refs.createTaskForm.reset();
    await listTasks();
  } catch (error) {
    setStatus(refs.createTaskMessage, error.message, "error");
  }
}

function taskId(task) {
  return task.id ?? task.task_id;
}

function taskCompleted(task) {
  return Boolean(task.completed ?? task.is_completed);
}

async function completeTask(id) {
  try {
    await apiFetch(`/tasks/${id}`, {
      method: "PUT",
      body: JSON.stringify({ completed: true })
    }, true);
    setStatus(refs.listTaskMessage, "Task marked complete.", "success");
    await listTasks();
  } catch (error) {
    setStatus(refs.listTaskMessage, error.message, "error");
  }
}

async function deleteTask(id) {
  try {
    await apiFetch(`/tasks/${id}`, { method: "DELETE" }, true);
    setStatus(refs.listTaskMessage, "Task deleted.", "success");
    await listTasks();
  } catch (error) {
    setStatus(refs.listTaskMessage, error.message, "error");
  }
}

function renderTasks(tasks) {
  refs.taskList.innerHTML = "";

  if (!Array.isArray(tasks) || tasks.length === 0) {
    refs.taskList.innerHTML = '<li class="muted">No tasks found.</li>';
    return;
  }

  tasks.forEach((task) => {
    const li = document.createElement("li");
    const id = taskId(task);
    const completed = taskCompleted(task);
    li.className = `task-item ${completed ? "completed" : ""}`;

    const meta = document.createElement("div");
    const title = document.createElement("p");
    title.className = "task-title";
    title.textContent = task.title || `Task ${id}`;
    title.style.margin = "0";

    const subtitle = document.createElement("p");
    subtitle.className = "muted small";
    subtitle.style.margin = "0.2rem 0 0";
    subtitle.textContent = `ID: ${id} • Status: ${completed ? "Completed" : "Pending"}`;

    meta.append(title, subtitle);

    const actions = document.createElement("div");
    actions.className = "task-actions";

    if (!completed) {
      const completeBtn = document.createElement("button");
      completeBtn.type = "button";
      completeBtn.textContent = "Mark Complete";
      completeBtn.className = "complete";
      completeBtn.addEventListener("click", () => completeTask(id));
      actions.appendChild(completeBtn);
    }

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.textContent = "Delete";
    deleteBtn.className = "danger";
    deleteBtn.addEventListener("click", () => deleteTask(id));
    actions.appendChild(deleteBtn);

    li.append(meta, actions);
    refs.taskList.appendChild(li);
  });
}

async function listTasks() {
  try {
    const tasks = await apiFetch("/tasks", {}, true);
    renderTasks(tasks);
    setStatus(refs.listTaskMessage, "Tasks loaded.", "success");
  } catch (error) {
    renderTasks([]);
    setStatus(refs.listTaskMessage, error.message, "error");
  }
}

refs.verifyBackendBtn.addEventListener("click", verifyBackend);
refs.registerForm.addEventListener("submit", registerUser);
refs.loginForm.addEventListener("submit", loginUser);
refs.logoutBtn.addEventListener("click", () => {
  clearToken();
  setStatus(refs.loginMessage, "Logged out.", "success");
  renderTasks([]);
});
refs.createTaskForm.addEventListener("submit", createTask);
refs.refreshTasksBtn.addEventListener("click", listTasks);

verifyBackend();
if (getToken()) {
  listTasks();
}
