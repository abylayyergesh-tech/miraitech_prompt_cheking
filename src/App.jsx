import { useState } from "react";
import AnalysisResult from "./AnalysisResult.jsx";
import "./App.css";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";
const TOKEN_KEY = "auth_token";
const REFRESH_KEY = "refresh_token";
const USER_KEY = "auth_user";

function loadStoredAuth() {
  const token = sessionStorage.getItem(TOKEN_KEY) ?? "";
  const userRaw = sessionStorage.getItem(USER_KEY);
  let user = null;
  if (userRaw) {
    try {
      user = JSON.parse(userRaw);
    } catch {
      sessionStorage.removeItem(USER_KEY);
    }
  }
  return { token, user };
}

export default function App() {
  const stored = loadStoredAuth();
  const [token, setToken] = useState(stored.token);
  const [user, setUser] = useState(stored.user);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Data from GET
  const [sessionInfo, setSessionInfo] = useState(null);
  const [regularPrompt, setRegularPrompt] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");

  // Result from POST
  const [analysisResult, setAnalysisResult] = useState("");
  const [analysisError, setAnalysisError] = useState("");

  async function handleLogin(e) {
    e?.preventDefault();
    if (!username.trim() || !password) {
      setError("Please enter your email/login and password.");
      return;
    }
    setError("");
    setLoggingIn(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: username.trim(),
          password,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.detail || "Login failed.");
      }

      sessionStorage.setItem(TOKEN_KEY, data.access_token);
      sessionStorage.setItem(REFRESH_KEY, data.refresh_token);
      sessionStorage.setItem(USER_KEY, JSON.stringify(data.user));

      setToken(data.access_token);
      setUser(data.user);
      setPassword("");
    } catch (err) {
      setError(err.message || "Login failed.");
    } finally {
      setLoggingIn(false);
    }
  }

  function handleLogout() {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_KEY);
    sessionStorage.removeItem(USER_KEY);
    setToken("");
    setUser(null);
    setPassword("");
    setSessionInfo(null);
    setRegularPrompt("");
    setSystemPrompt("");
    setAnalysisResult("");
    setAnalysisError("");
    setError("");
  }

  async function handleLoad() {
    if (!token.trim()) {
      setError("Please log in first.");
      return;
    }
    if (!sessionId.trim()) {
      setError("Please enter a session ID.");
      return;
    }
    setError("");
    setAnalysisResult("");
    setAnalysisError("");
    setSessionInfo(null);
    setLoading(true);

    try {
      const res = await fetch(
        `${API_BASE}/api/sessions/${sessionId}/prompt_testing`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token.trim()}`,
          },
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setSessionInfo({
        session_id: data.session_id,
        protocol_id: data.protocol_id,
        protocol_name: data.protocol_name,
      });
      setRegularPrompt(data.regular_prompt);
      setSystemPrompt(data.system_prompt);
    } catch (err) {
      setError(err.message || "Failed to load session data.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    if (!sessionInfo) return;
    setAnalysisResult("");
    setAnalysisError("");
    setSubmitting(true);

    try {
      const formData = new FormData();
      if (systemPrompt.trim()) {
        formData.append("system_prompt", systemPrompt.trim());
      }

      const res = await fetch(
        `${API_BASE}/api/sessions/${sessionInfo.session_id}/prompt_testing`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token.trim()}`,
          },
          body: formData,
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setAnalysisResult(data.response);
    } catch (err) {
      setAnalysisError(err.message || "Analysis failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-title">
          <span className="header-logo">⚡</span>
          <h1>Prompt Testing</h1>
        </div>
        <div className="header-controls">
          {!token ? (
            <form className="auth-form" onSubmit={handleLogin}>
              <input
                className="input-field login-input"
                type="text"
                placeholder="Email or login"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
              />
              <input
                className="input-field login-input"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                className="btn btn-login"
                type="submit"
                disabled={loggingIn}
              >
                {loggingIn ? <span className="spinner" /> : "Log In"}
              </button>
            </form>
          ) : (
            <>
              <span className="auth-status">
                <span className="auth-dot" />
                {user?.username || user?.email || "Signed in"}
              </span>
              <button className="btn btn-logout" type="button" onClick={handleLogout}>
                Log Out
              </button>
            </>
          )}
          <input
            className="input-field session-input"
            type="number"
            placeholder="Session ID"
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLoad()}
            disabled={!token}
          />
          <button
            className="btn btn-load"
            onClick={handleLoad}
            disabled={loading || !token}
          >
            {loading ? <span className="spinner" /> : "Load Session"}
          </button>
        </div>
      </header>

      {error && (
        <div className="banner banner-error">
          <span>⚠</span> {error}
        </div>
      )}

      {/* Main two-column layout */}
      <main className="main-columns">
        {/* Left block — System Prompt */}
        <div className="block block-left">
          <div className="block-header">
            <h2 className="block-title">System Prompt</h2>
            <span className="block-badge editable">Editable</span>
          </div>

          <textarea
            className="prompt-textarea"
            placeholder={
              sessionInfo
                ? "Edit the system prompt here…"
                : "Load a session to see the system prompt."
            }
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            disabled={!sessionInfo}
          />

          <div className="block-footer">
            <button
              className="btn btn-submit"
              onClick={handleSubmit}
              disabled={!sessionInfo || submitting}
            >
              {submitting ? (
                <>
                  <span className="spinner" /> Analysing…
                </>
              ) : (
                "Run Analysis"
              )}
            </button>
          </div>

        </div>

        {/* Right block — Regular Prompt (read-only) */}
        <div className="block block-right">
          <div className="block-header">
            <h2 className="block-title">Regular Prompt</h2>
            <span className="block-badge readonly">Read-only</span>
          </div>

          {sessionInfo && (
            <div className="session-meta">
              <div className="meta-chip">
                <span className="meta-label">Session ID</span>
                <span className="meta-value">{sessionInfo.session_id}</span>
              </div>
              <div className="meta-chip">
                <span className="meta-label">Protocol</span>
                <span className="meta-value">{sessionInfo.protocol_name}</span>
              </div>
            </div>
          )}

          <textarea
            className="prompt-textarea readonly"
            placeholder={
              sessionInfo
                ? ""
                : "Load a session to see the regular prompt."
            }
            value={regularPrompt}
            readOnly
          />
        </div>
      </main>

      {(analysisResult || analysisError) && (
        <section
          className={`analysis-panel ${analysisError ? "analysis-panel-error" : ""}`}
        >
          <div className="analysis-panel-header">
            <h2 className="analysis-panel-title">
              {analysisError ? "Analysis Error" : "Gemini Analysis"}
            </h2>
            {!analysisError && sessionInfo && (
              <span className="analysis-panel-meta">
                Session {sessionInfo.session_id} · {sessionInfo.protocol_name}
              </span>
            )}
          </div>
          <div className="analysis-panel-body">
            {analysisError ? (
              <pre className="result-text result-error-text">{analysisError}</pre>
            ) : (
              <AnalysisResult text={analysisResult} />
            )}
          </div>
        </section>
      )}
    </div>
  );
}
