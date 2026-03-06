import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";

export default function Nav() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const nav = useNavigate();

  return (
    <div className="nav">
      <div className="nav-inner">
        <Link className="brand" to="/">🌾 Crop Marketplace</Link>

        {!user && (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        )}

        {user?.role === "buyer" && (
          <>
            <Link to="/buyer">Browse</Link>
            <Link to="/buyer/orders">My Orders</Link>
          </>
        )}

        {user?.role === "farmer" && (
          <>
            <Link to="/farmer">My Crops</Link>
            <Link to="/farmer/orders">Incoming Orders</Link>
          </>
        )}

        {user?.role === "admin" && <Link to="/admin">Admin</Link>}

        <div className="spacer" />

        <button className="btn" onClick={toggle}>
          {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
        </button>

        {user ? (
          <div className="row">
            <span className="pill">{user.name} • {user.role}</span>
            <button className="btn" onClick={() => { logout(); nav("/"); }}>Logout</button>
          </div>
        ) : (
          <span className="pill">Not signed in</span>
        )}
      </div>
    </div>
  );
}