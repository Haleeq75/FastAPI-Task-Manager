const API_BASE_URL = (window.APP_CONFIG?.API_BASE_URL || "").replace(/\/$/, "");
const TOKEN_KEY = "task_manager_token";
const { useEffect, useMemo, useState } = React;

function apiFetch(path, options = {}, requiresAuth = false) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (requiresAuth) {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      return Promise.reject(new Error("Please login first."));
    }
    headers.Authorization = `Bearer ${token}`;
  }

  return fetch(`${API_BASE_URL}${path}`, { ...options, headers }).then(async (response) => {
    if (!response.ok) {
      let details = response.statusText;
      try {
        const body = await response.json();
        details = body.error?.message || body.detail || JSON.stringify(body);
      } catch {
        // Keep status text for non-json responses.
      }
      throw new Error(details || "Request failed");
    }

    if (response.status === 204) {
      return null;
    }

    return response.json();
  });
}

function TaskItem({ task, onComplete, onDelete }) {
  const id = task.id ?? task.task_id;
  const completed = Boolean(task.completed ?? task.is_completed);

  return (
    <li className={`task-item ${completed ? "completed" : ""}`}>
      <div>
        <p className="task-title" style={{ margin: 0 }}>{task.title || `Task ${id}`}</p>
        <p className="muted small" style={{ margin: "0.2rem 0 0" }}>
          ID: {id} • Status: {completed ? "Completed" : "Pending"}
        </p>
      </div>
      <div className="task-actions">
        {!completed && (
          <button type="button" className="complete" onClick={() => onComplete(id)}>
            Mark Complete
          </button>
        )}
        <button type="button" className="danger" onClick={() => onDelete(id)}>
          Delete
        </button>
      </div>
    </li>
  );
}

function App() {
  const [backendStatus, setBackendStatus] = useState("");
  const [backendStatusType, setBackendStatusType] = useState("");
  const [registerData, setRegisterData] = useState({ username: "", password: "" });
  const [registerMessage, setRegisterMessage] = useState({ text: "", type: "" });
  const [loginData, setLoginData] = useState({ username: "", password: "" });
  const [loginMessage, setLoginMessage] = useState({ text: "", type: "" });
  const [createTitle, setCreateTitle] = useState("");
  const [createTaskMessage, setCreateTaskMessage] = useState({ text: "", type: "" });
  const [listTaskMessage, setListTaskMessage] = useState({ text: "", type: "" });
  const [tasks, setTasks] = useState([]);

  const isLoggedIn = useMemo(() => Boolean(localStorage.getItem(TOKEN_KEY)), []);

  useEffect(() => {
    if (isLoggedIn) {
      listTasks();
    }
  }, []);

  function setStatus(setter, text, type = "") {
    setter({ text, type });
  }

  async function verifyBackend() {
    setBackendStatus("Checking backend...");
    setBackendStatusType("");
    try {
      await apiFetch("/openapi.json");
      setBackendStatus("Connected successfully to backend base URL.");
      setBackendStatusType("success");
    } catch (error) {
      setBackendStatus(`Unable to reach backend: ${error.message}`);
      setBackendStatusType("error");
    }
  }

  async function registerUser(event) {
    event.preventDefault();
    try {
      await apiFetch("/register", {
        method: "POST",
        body: JSON.stringify({ email: registerData.username, password: registerData.password })
      });
      setStatus(setRegisterMessage, "Registration successful. You can now log in.", "success");
      setRegisterData({ username: "", password: "" });
    } catch (error) {
      setStatus(setRegisterMessage, error.message, "error");
    }
  }

  async function loginUser(event) {
    event.preventDefault();
    try {
      const result = await apiFetch("/login", {
        method: "POST",
        body: JSON.stringify({ email: loginData.username, password: loginData.password })
      });
      const token = result.access_token || result.token;
      if (!token) {
        throw new Error("Login succeeded but no token returned.");
      }
      localStorage.setItem(TOKEN_KEY, token);
      setStatus(setLoginMessage, "Login successful. JWT stored in localStorage.", "success");
      setLoginData({ username: "", password: "" });
      await listTasks();
    } catch (error) {
      setStatus(setLoginMessage, error.message, "error");
    }
  }

  function logoutUser() {
    localStorage.removeItem(TOKEN_KEY);
    setTasks([]);
    setStatus(setLoginMessage, "Logged out.", "");
  }

  async function createTask(event) {
    event.preventDefault();
    try {
      await apiFetch(
        "/tasks",
        {
          method: "POST",
          body: JSON.stringify({ title: createTitle, description: createTitle })
        },
        true
      );
      setStatus(setCreateTaskMessage, "Task created.", "success");
      setCreateTitle("");
      await listTasks();
    } catch (error) {
      setStatus(setCreateTaskMessage, error.message, "error");
    }
  }

  async function listTasks() {
    try {
      const data = await apiFetch("/tasks", {}, true);
      setTasks(Array.isArray(data) ? data : []);
      setStatus(setListTaskMessage, "Tasks loaded.", "success");
    } catch (error) {
      setTasks([]);
      setStatus(setListTaskMessage, error.message, "error");
    }
  }

  async function completeTask(id) {
    try {
      await apiFetch(`/tasks/${id}`, { method: "PUT", body: JSON.stringify({ completed: true }) }, true);
      setStatus(setListTaskMessage, "Task marked complete.", "success");
      await listTasks();
    } catch (error) {
      setStatus(setListTaskMessage, error.message, "error");
    }
  }

  async function deleteTask(id) {
    try {
      await apiFetch(`/tasks/${id}`, { method: "DELETE" }, true);
      setStatus(setListTaskMessage, "Task deleted.", "success");
      await listTasks();
    } catch (error) {
      setStatus(setListTaskMessage, error.message, "error");
    }
  }

  return (
    <main className="container">
      <header className="header">
        <h1>FastAPI Task Manager</h1>
        <p className="subheading">Simple responsive frontend for auth + task CRUD (React)</p>
      </header>

      <section className="panel" id="backend-status-panel">
        <div className="row between wrap">
          <div>
            <h2>Backend Connection</h2>
            <p className="muted">Current API Base URL: <code>{API_BASE_URL || "(same-origin)"}</code></p>
          </div>
          <button id="verify-backend-btn" type="button" onClick={verifyBackend}>Verify API URL</button>
        </div>
        <p className={`status ${backendStatusType}`.trim()}>{backendStatus}</p>
      </section>

      <section className="panel auth-grid">
        <form className="form-card" onSubmit={registerUser}>
          <h2>Registration</h2>
          <label>
            Username
            <input
              name="username"
              type="text"
              autoComplete="username"
              required
              value={registerData.username}
              onChange={(e) => setRegisterData((v) => ({ ...v, username: e.target.value }))}
            />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              required
              value={registerData.password}
              onChange={(e) => setRegisterData((v) => ({ ...v, password: e.target.value }))}
            />
          </label>
          <button type="submit">Register</button>
          <p className={`status ${registerMessage.type}`.trim()}>{registerMessage.text}</p>
        </form>

        <form className="form-card" onSubmit={loginUser}>
          <h2>Login</h2>
          <label>
            Username
            <input
              name="username"
              type="text"
              autoComplete="username"
              required
              value={loginData.username}
              onChange={(e) => setLoginData((v) => ({ ...v, username: e.target.value }))}
            />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={loginData.password}
              onChange={(e) => setLoginData((v) => ({ ...v, password: e.target.value }))}
            />
          </label>
          <button type="submit">Login</button>
          <p className={`status ${loginMessage.type}`.trim()}>{loginMessage.text}</p>
          <p className="muted small">JWT stored in localStorage key <code>{TOKEN_KEY}</code>.</p>
          <button className="secondary" type="button" onClick={logoutUser}>Logout</button>
        </form>
      </section>

      <section className="panel">
        <form onSubmit={createTask}>
          <h2>Create Task</h2>
          <div className="row wrap gap-sm">
            <label className="grow">
              Title
              <input
                name="title"
                type="text"
                maxLength="200"
                required
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
              />
            </label>
            <button type="submit">Create</button>
          </div>
          <p className={`status ${createTaskMessage.type}`.trim()}>{createTaskMessage.text}</p>
        </form>
      </section>

      <section className="panel">
        <div className="row between wrap">
          <h2>List Tasks</h2>
          <button type="button" onClick={listTasks}>Refresh Tasks</button>
        </div>
        <p className={`status ${listTaskMessage.type}`.trim()}>{listTaskMessage.text}</p>
        <ul className="task-list">
          {tasks.length === 0 ? (
            <li className="muted">No tasks found.</li>
          ) : (
            tasks.map((task) => (
              <TaskItem key={task.id ?? task.task_id} task={task} onComplete={completeTask} onDelete={deleteTask} />
            ))
          )}
        </ul>
      </section>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
