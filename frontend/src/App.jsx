import React from "react";
import { Routes, Route } from "react-router-dom";
import Nav from "./components/Nav.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import BuyerBrowse from "./pages/BuyerBrowse.jsx";
import BuyerOrders from "./pages/BuyerOrders.jsx";
import FarmerCrops from "./pages/FarmerCrops.jsx";
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

        <Route path="/buyer" element={<ProtectedRoute roles={["buyer"]}><BuyerBrowse /></ProtectedRoute>} />
        <Route path="/buyer/orders" element={<ProtectedRoute roles={["buyer"]}><BuyerOrders /></ProtectedRoute>} />

        <Route path="/farmer" element={<ProtectedRoute roles={["farmer"]}><FarmerCrops /></ProtectedRoute>} />
        <Route path="/farmer/orders" element={<ProtectedRoute roles={["farmer"]}><FarmerOrders /></ProtectedRoute>} />

        <Route path="/admin" element={<ProtectedRoute roles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
      </Routes>
    </div>
  );
}
