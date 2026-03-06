import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Home() {
  const { user } = useAuth();

  return (
    <div>
      <section className="hero">
        <div className="hero-bg" />
        <div className="hero-overlay" />

        <div className="hero-inner">
          <h1 className="hero-title">
            Sell crops directly. <br /> Buy at transparent prices.
          </h1>

          <p className="hero-sub">
            A modern marketplace connecting farmers to restaurants, retailers, and wholesalers —
            with location-based listings, numeric quantity + unit (kg/bag), direct order requests, and admin oversight.
          </p>

          <div className="hero-cta">
            {!user ? (
              <>
                <Link className="btn primary" to="/register">Create an account</Link>
                <Link className="btn secondary" to="/login">Login</Link>
              </>
            ) : (
              <>
                {user.role === "buyer" && <Link className="btn primary" to="/buyer">Browse crops</Link>}
                {user.role === "farmer" && <Link className="btn primary" to="/farmer">Manage listings</Link>}
                {user.role === "admin" && <Link className="btn primary" to="/admin">Open admin</Link>}
              </>
            )}
          </div>

          <div className="hero-badges">
            <span className="pill">No middlemen</span>
            <span className="pill">Farmer-set pricing</span>
            <span className="pill">Location-based listings</span>
            <span className="pill">Order requests</span>
          </div>
        </div>
      </section>

      <section className="section">
        <h3>How it works</h3>
        <div className="steps">
          <div className="step">
            <div className="step-num">1</div>
            <strong>Farmers list crops</strong>
            <div className="small">Name, numeric quantity, unit (kg/bag), price per unit, and location.</div>
          </div>

          <div className="step">
            <div className="step-num">2</div>
            <strong>Buyers browse & request</strong>
            <div className="small">Filter by name/location/price and send requests with quantity + contact.</div>
          </div>

          <div className="step">
            <div className="step-num">3</div>
            <strong>Confirm & transact</strong>
            <div className="small">Farmer accepts/rejects/completes. Admin monitors users and activity.</div>
          </div>
        </div>
      </section>

      <section className="section">
        <h3>Why this marketplace</h3>
        <div className="cards3">
          <div className="card">
            <div className="kv">
              <strong>Better farmer income</strong>
              <span className="pill">Farmer-first</span>
            </div>
            <div className="small">Farmers set prices and sell directly, reducing broker exploitation.</div>
          </div>

          <div className="card">
            <div className="kv">
              <strong>Lower buyer costs</strong>
              <span className="pill">Direct sourcing</span>
            </div>
            <div className="small">Buyers negotiate and procure from the source, reducing markups and delays.</div>
          </div>

          <div className="card">
            <div className="kv">
              <strong>Transparency</strong>
              <span className="pill">Open listings</span>
            </div>
            <div className="small">Pricing is visible and listings are location-based, improving access.</div>
          </div>
        </div>
      </section>

      <section className="cta-band">
        <div className="cta-band-inner">
          <div>
            <strong>Ready to use it?</strong>
            <div className="small">Create an account and start listing or sourcing crops today.</div>
          </div>
          <div className="row">
            <Link className="btn primary" to="/register">Get started</Link>
            <Link className="btn" to="/login">Login</Link>
          </div>
        </div>
      </section>
    </div>
  );
}