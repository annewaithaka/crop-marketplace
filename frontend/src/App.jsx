// frontend/src/App.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Nav from "./components/Nav.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import BuyerBrowse from "./pages/BuyerBrowse.jsx";
import BuyerOrders from "./pages/BuyerOrders.jsx";
import FarmerLayout from "./pages/FarmerLayout.jsx";
import FarmerAddListing from "./pages/FarmerAddListing.jsx";
import FarmerListings from "./pages/FarmerListings.jsx";
import FarmerOrders from "./pages/FarmerOrders.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";

export default function App() {
  return (
    <div>
      <Nav />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/buyer"
          element={
            <ProtectedRoute roles={["buyer"]}>
              <BuyerBrowse />
            </ProtectedRoute>
          }
        />
        <Route
          path="/buyer/orders"
          element={
            <ProtectedRoute roles={["buyer"]}>
              <BuyerOrders />
            </ProtectedRoute>
          }
        />

        {/* Farmer nested area */}
        <Route
          path="/farmer"
          element={
            <ProtectedRoute roles={["farmer"]}>
              <FarmerLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="listings" replace />} />
          <Route path="add" element={<FarmerAddListing />} />
          <Route path="listings" element={<FarmerListings />} />
          <Route path="orders" element={<FarmerOrders />} />
        </Route>

        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={["admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}