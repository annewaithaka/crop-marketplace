import React, { useState } from "react";
import { api } from "../api.js";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("buyer");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr(""); setOk("");
    try {
      await api.register({ name, email, phone, role, password });
      setOk("Registered. Redirecting to login...");
      setTimeout(() => nav("/login"), 600);
    } catch (e2) {
      setErr(e2.message);
    }
  }

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: 520, margin: "0 auto" }}>
        <h2>Create account</h2>
        <form onSubmit={onSubmit} className="grid">
          <div className="grid">
            <label>Full name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
          </div>

          <div className="grid">
            <label>Email</label>
            <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>

          <div className="grid">
            <label>Phone (optional)</label>
            <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0700..." />
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
            <input className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create a password" type="password" />
          </div>

          <button className="btn primary" type="submit">Create account</button>

          {err && <div className="error">{err}</div>}
          {ok && <div className="success">{ok}</div>}
        </form>
      </div>
    </div>
  );
}
