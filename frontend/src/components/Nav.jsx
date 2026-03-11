// frontend/src/components/Nav.jsx
import React from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";

function AppNavLink(props) {
  return (
    <NavLink
      {...props}
      className={({ isActive }) => (isActive ? "nav-link nav-link-active" : "nav-link")}
    />
  );
}

export default function Nav() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const nav = useNavigate();

  return (
    <div className="nav">
      <div className="nav-inner">
        <Link className="brand" to="/">
          🌾 Crop Marketplace
        </Link>

        <div className="nav-links">
          {!user && (
            <>
              <AppNavLink to="/login">Login</AppNavLink>
              <AppNavLink to="/register">Register</AppNavLink>
            </>
          )}

          {user?.role === "buyer" && (
            <>
              <AppNavLink to="/buyer" end>
                Browse
              </AppNavLink>
              <AppNavLink to="/buyer/orders">My Orders</AppNavLink>
            </>
          )}

          {user?.role === "farmer" && (
            <>
              <AppNavLink to="/farmer" end>
                My Crops
              </AppNavLink>
              <AppNavLink to="/farmer/orders">Incoming Orders</AppNavLink>
            </>
          )}

          {user?.role === "admin" && <AppNavLink to="/admin">Admin</AppNavLink>}
        </div>

        <div className="spacer" />

        <div className="nav-actions">
          <button className="btn" onClick={toggle} type="button">
            {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
          </button>

          {user ? (
            <>
              <span className="pill">
                {user.name} • {user.role}
              </span>
              <button
                className="btn"
                type="button"
                onClick={() => {
                  logout();
                  nav("/");
                }}
              >
                Logout
              </button>
            </>
          ) : (
            <span className="pill">Not signed in</span>
          )}
        </div>
      </div>
    </div>
  );
}