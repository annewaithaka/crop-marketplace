// frontend/src/components/Nav.jsx
import React from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

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
  const nav = useNavigate();

  return (
    <div className="nav">
      <div className="nav-inner">
        <Link className="brand" to="/">
          <span className="brand-mark" aria-hidden="true">C</span>
          Crop Marketplace
        </Link>

        <div className="nav-links">
          {!user && (
            <>
              <AppNavLink to="/login">Sign in</AppNavLink>
              <AppNavLink to="/register">Register</AppNavLink>
            </>
          )}

          {user?.role === "buyer" && (
            <>
              <AppNavLink to="/buyer" end>Browse</AppNavLink>
              <AppNavLink to="/buyer/orders">My orders</AppNavLink>
            </>
          )}

          {user?.role === "farmer" && (
            <>
              <AppNavLink to="/farmer/listings">My listings</AppNavLink>
              <AppNavLink to="/farmer/add">Add listing</AppNavLink>
              <AppNavLink to="/farmer/orders">Incoming orders</AppNavLink>
            </>
          )}

          {user?.role === "admin" && <AppNavLink to="/admin">Admin</AppNavLink>}
        </div>

        <div className="nav-actions">
          {user ? (
            <>
              <span className="pill brand">
                {user.name} · {user.role}
              </span>
              <button
                className="btn sm"
                type="button"
                onClick={() => {
                  logout();
                  nav("/");
                }}
              >
                Sign out
              </button>
            </>
          ) : (
            <Link className="btn sm primary" to="/register">
              Get started
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
