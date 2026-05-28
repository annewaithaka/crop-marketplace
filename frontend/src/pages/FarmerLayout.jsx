// frontend/src/pages/FarmerLayout.jsx
import React from "react";
import { Outlet } from "react-router-dom";

export default function FarmerLayout() {
  return (
    <div className="container">
      <Outlet />
    </div>
  );
}
