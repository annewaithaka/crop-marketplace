// frontend/src/pages/Home.jsx
import React, { useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const GALLERY = [
  { src: "/gallery1.jpeg", alt: "Fresh crops on a farm" },
  { src: "/gallery2.jpeg", alt: "Farmer harvesting produce" },
  { src: "/gallery3.jpeg", alt: "Market produce display" },
  { src: "/gallery4.jpeg", alt: "Vegetables close-up" },
  { src: "/gallery5.jpeg", alt: "Irrigation and farming" },
  { src: "/gallery6.jpeg", alt: "Produce in baskets" }
];

export default function Home() {
  const { user } = useAuth();
  const galleryRef = useRef(null);

  function scrollGallery() {
    const el = galleryRef.current;
    if (!el) return;
    el.scrollBy({ left: el.clientWidth * 0.8, behavior: "smooth" });
  }

  const signedInCta = user
    ? user.role === "buyer"
      ? { text: "Browse crops", href: "/buyer" }
      : user.role === "farmer"
        ? { text: "Manage listings", href: "/farmer" }
        : { text: "Open admin", href: "/admin" }
    : null;

  return (
    <div>
      {/* HERO */}
      <section className="hero">
        <div className="hero-inner">
          <div>
            <h1 className="hero-title">Kenya’s direct crop market.</h1>
            <div className="hero-tagline">List • Request • Trade</div>
            <p className="hero-sub">
              Buy and sell crops directly — transparent pricing, location-based listings,
              order requests, and admin oversight to keep the marketplace trustworthy.
            </p>

            <div className="row" style={{ marginTop: 18 }}>
              {signedInCta ? (
                <Link className="btn primary" to={signedInCta.href}>
                  {signedInCta.text}
                </Link>
              ) : (
                <>
                  <Link className="btn primary" to="/register">Get started</Link>
                  <Link className="btn" to="/login">Sign in</Link>
                </>
              )}
            </div>

            <div className="hero-highlights">
              <span className="pill">No middlemen</span>
              <span className="pill">Units: kg / bag / crate</span>
              <span className="pill">Direct order requests</span>
              <span className="pill">Location-based listings</span>
            </div>

            <p className="small" style={{ marginTop: 16 }}>
              Farmers earn more. Buyers reduce procurement costs. Prices become transparent.
            </p>
          </div>

          <div className="hero-media">
            <img
              src="/hero.jpeg"
              alt="Farmer working in the field"
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
          </div>
        </div>
      </section>

      {/* INTRO + HOW IT WORKS */}
      <section className="section">
        <div className="split">
          <div>
            <div className="section-title">Built for real trading</div>
            <div className="section-headline">Clear roles. Simple workflow.</div>
            <p className="small">
              This platform removes brokers and connects farmers to buyers like restaurants,
              wholesalers, and retailers. Admin keeps the system safe and organized, with
              verified accounts and full visibility into marketplace activity.
            </p>
            <p className="small">
              Built around the way real trades happen: a listing, a conversation, an agreed
              price, and a pickup once both sides are ready.
            </p>
          </div>

          <div className="card">
            <div className="section-title">How it works</div>
            <ol style={{ margin: "8px 0 0", paddingLeft: 18, lineHeight: 1.8 }}>
              <li className="small">Farmer lists a crop with quantity, unit, and pickup location</li>
              <li className="small">Buyer browses listings and sends an order request</li>
              <li className="small">Farmer accepts, rejects, or completes the order</li>
              <li className="small">Buyer and farmer message directly to coordinate pickup</li>
              <li className="small">Admin monitors activity and ensures trust</li>
            </ol>
          </div>
        </div>
      </section>

      {/* ROLE CARDS */}
      <section className="section">
        <div className="section-title">What each user can do</div>

        <div className="roles">
          <div className="card">
            <div className="kv">
              <strong>Farmer</strong>
              <span className="pill brand">Sell directly</span>
            </div>
            <div className="small" style={{ marginTop: 10 }}>
              • Create crop listings with name, quantity, unit, and price<br />
              • Add crop images to attract buyers<br />
              • Pin pickup location on a map (county and town)<br />
              • Manage incoming orders and message buyers
            </div>
            <div className="row" style={{ marginTop: 14 }}>
              <Link className="btn primary" to="/register">Register as farmer</Link>
            </div>
          </div>

          <div className="card">
            <div className="kv">
              <strong>Buyer</strong>
              <span className="pill brand">Source smarter</span>
            </div>
            <div className="small" style={{ marginTop: 10 }}>
              • Browse and filter listings by name, location, or price<br />
              • Filter by distance from your location<br />
              • Request orders with proposed price and delivery notes<br />
              • Message farmers and track order status
            </div>
            <div className="row" style={{ marginTop: 14 }}>
              <Link className="btn primary" to="/register">Register as buyer</Link>
            </div>
          </div>

          <div className="card">
            <div className="kv">
              <strong>Admin</strong>
              <span className="pill brand">Trust &amp; safety</span>
            </div>
            <div className="small" style={{ marginTop: 10 }}>
              • Activate or deactivate user accounts<br />
              • Monitor crop listings and order activity<br />
              • View KPI dashboards and trend reports<br />
              • Analyze top crops, farmers, and buyers
            </div>
            <div className="row" style={{ marginTop: 14 }}>
              <Link className="btn secondary" to="/login">Admin sign in</Link>
            </div>
          </div>
        </div>
      </section>

      {/* GALLERY */}
      <section className="section">
        <div className="page-header" style={{ marginBottom: 12 }}>
          <div>
            <div className="section-title">From the farm</div>
            <div className="section-headline">A marketplace that feels real</div>
          </div>
          <div className="page-header-right">
            <button type="button" className="btn sm" onClick={scrollGallery}>
              Scroll →
            </button>
          </div>
        </div>

        <div className="gallery-strip" ref={galleryRef}>
          {GALLERY.map((g) => (
            <div key={g.src} className="gallery-item">
              <img
                src={g.src}
                alt={g.alt}
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-col">
            <div className="footer-title">Crop Marketplace</div>
            <div className="small">
              A direct trading platform for farmers and buyers across Kenya — transparent pricing,
              order requests, and admin oversight.
            </div>
          </div>

          <div className="footer-col">
            <div className="footer-title">Platform</div>
            <Link to="/">Home</Link>
            <Link to="/register">Register</Link>
            <Link to="/login">Sign in</Link>
          </div>

          <div className="footer-col">
            <div className="footer-title">Roles</div>
            <Link to="/register">Farmer</Link>
            <Link to="/register">Buyer</Link>
            <Link to="/login">Admin</Link>
          </div>

          <div className="footer-col">
            <div className="footer-title">Support</div>
            <a href="#!" onClick={(e) => e.preventDefault()}>About</a>
            <a href="#!" onClick={(e) => e.preventDefault()}>Contact</a>
            <a href="#!" onClick={(e) => e.preventDefault()}>Privacy</a>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="footer-bottom-inner">
            <span>© {new Date().getFullYear()} Crop Marketplace. All rights reserved.</span>
            <span>Built for Kenyan farmers and buyers.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
