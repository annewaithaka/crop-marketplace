//frontend/src/pages/FarmerLayout.jsx
import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import PageHeader from "../components/PageHeader.jsx";

function SubLink({ to, children, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => `btn ${isActive ? "active" : ""}`}
    >
      {children}
    </NavLink>
  );
}

export default function FarmerLayout() {
  return (
    <div className="container">
      <PageHeader
        title="Farmer Dashboard"
        subtitle="Add listings, manage your listings, and manage images."
      />
      <div className="subnav">
        <SubLink to="/farmer/add">Add Listing</SubLink>
        <SubLink to="/farmer/listings">My Listings</SubLink>
        <SubLink to="/farmer/orders">Orders</SubLink>
      </div>
      <div style={{ height: 14 }} />
      <Outlet />
    </div>
  );
}