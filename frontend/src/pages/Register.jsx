// frontend/src/pages/Register.jsx
import React, { useMemo, useState } from "react";
import { api } from "../api.js";
import { useNavigate } from "react-router-dom";
import { useToast } from "../context/ToastContext.jsx";
import PageHeader from "../components/PageHeader.jsx";

function isValidEmail(value) {
  return /^\S+@\S+\.\S+$/.test(value);
}

export default function Register() {
  const nav = useNavigate();
  const toast = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("buyer");
  const [password, setPassword] = useState("");

  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => {
    return name.trim() && email.trim() && password && !loading;
  }, [name, email, password, loading]);

  function validate() {
    const next = {};

    if (!name.trim()) next.name = "Full name is required.";

    if (!email.trim()) next.email = "Email is required.";
    else if (!isValidEmail(email.trim())) next.email = "Enter a valid email address.";

    if (phone.trim() && phone.trim().length < 7) next.phone = "Enter a valid phone number.";

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
      await api.register({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || "",
        role,
        password
      });

      toast.show({
        type: "success",
        title: "Account created",
        message: "Please login to continue."
      });

      nav("/login");
    } catch (e2) {
      const msg = e2?.message || "Registration failed.";
      setFormError(msg);
      toast.show({ type: "error", title: "Registration failed", message: msg });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <PageHeader title="Create account" subtitle="Register as a buyer or farmer to start trading." />

      <div className="card" style={{ maxWidth: 560, margin: "0 auto" }}>
        <form onSubmit={onSubmit} className="grid" noValidate>
          <div className="grid">
            <label>Full name</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              autoComplete="name"
              aria-invalid={Boolean(fieldErrors.name)}
              aria-describedby={fieldErrors.name ? "reg-name-error" : undefined}
            />
            {fieldErrors.name && (
              <div id="reg-name-error" className="error">
                {fieldErrors.name}
              </div>
            )}
          </div>

          <div className="grid">
            <label>Email</label>
            <input
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@gmail.com"
              inputMode="email"
              autoComplete="email"
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? "reg-email-error" : undefined}
            />
            {fieldErrors.email && (
              <div id="reg-email-error" className="error">
                {fieldErrors.email}
              </div>
            )}
          </div>

          <div className="grid">
            <label>Phone (optional)</label>
            <input
              className="input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0700..."
              inputMode="tel"
              autoComplete="tel"
              aria-invalid={Boolean(fieldErrors.phone)}
              aria-describedby={fieldErrors.phone ? "reg-phone-error" : undefined}
            />
            {fieldErrors.phone && (
              <div id="reg-phone-error" className="error">
                {fieldErrors.phone}
              </div>
            )}
          </div>

          <div className="grid">
            <label>Account type</label>
            <select className="select" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="buyer">Buyer</option>
              <option value="farmer">Farmer</option>
            </select>
          </div>

          <div className="grid">
            <label>Password</label>
            <input
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
              type="password"
              autoComplete="new-password"
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? "reg-password-error" : undefined}
            />
            {fieldErrors.password && (
              <div id="reg-password-error" className="error">
                {fieldErrors.password}
              </div>
            )}
          </div>

          <button className="btn primary" type="submit" disabled={!canSubmit}>
            {loading ? "Creating…" : "Create account"}
          </button>

          {formError && <div className="error">{formError}</div>}
        </form>
      </div>
    </div>
  );
}