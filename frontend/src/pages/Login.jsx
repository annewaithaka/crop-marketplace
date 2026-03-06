import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    try {
      const u = await login(email, password);
      nav(u.role === "buyer" ? "/buyer" : u.role === "farmer" ? "/farmer" : "/admin");
    } catch (e2) {
      setErr(e2.message);
    }
  }

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: 520, margin: "0 auto" }}>
        <h2>Login</h2>
        <form onSubmit={onSubmit} className="grid">
          <div className="grid">
            <label>Email</label>
            <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div className="grid">
            <label>Password</label>
            <input className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" type="password" />
          </div>
          <button className="btn primary" type="submit">Login</button>
          {err && <div className="error">{err}</div>}
        </form>
      </div>
    </div>
  );
}
