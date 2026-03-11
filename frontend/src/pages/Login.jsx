// frontend/src/pages/Login.jsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import PageHeader from "../components/PageHeader.jsx";

function isValidEmail(value) {
  return /^\S+@\S+\.\S+$/.test(value);
}

export default function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const nav = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => {
    return email.trim().length > 0 && password.length > 0 && !loading;
  }, [email, password, loading]);

  function validate() {
    const next = {};

    if (!email.trim()) next.email = "Email is required.";
    else if (!isValidEmail(email.trim())) next.email = "Enter a valid email address.";

    if (!password) next.password = "Password is required.";
    else if (password.length < 6) next.password = "Password must be at least 6 characters.";

    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setFormError("");
    setFieldErrors({});

    if (!validate()) return;

    setLoading(true);
    try {
      const u = await login(email.trim(), password);

      toast.show({
        type: "success",
        title: "Welcome back",
        message: "You are now signed in."
      });

      nav(u.role === "buyer" ? "/buyer" : u.role === "farmer" ? "/farmer" : "/admin");
    } catch (e2) {
      const msg = e2?.message || "Login failed.";
      setFormError(msg);
      toast.show({ type: "error", title: "Login failed", message: msg });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <PageHeader title="Login" subtitle="Sign in to manage your listings or place orders." />

      <div className="card" style={{ maxWidth: 560, margin: "0 auto" }}>
        <form onSubmit={onSubmit} className="grid" noValidate>
          <div className="grid">
            <label>Email</label>
            <input
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              inputMode="email"
              autoComplete="email"
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? "login-email-error" : undefined}
            />
            {fieldErrors.email && (
              <div id="login-email-error" className="error">
                {fieldErrors.email}
              </div>
            )}
          </div>

          <div className="grid">
            <label>Password</label>
            <input
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              type="password"
              autoComplete="current-password"
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? "login-password-error" : undefined}
            />
            {fieldErrors.password && (
              <div id="login-password-error" className="error">
                {fieldErrors.password}
              </div>
            )}
          </div>

          <button className="btn primary" type="submit" disabled={!canSubmit}>
            {loading ? "Logging in…" : "Login"}
          </button>

          {formError && <div className="error">{formError}</div>}
        </form>
      </div>
    </div>
  );
}