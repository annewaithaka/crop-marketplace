// frontend/src/pages/Home.jsx
import React from "react";
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

  const primaryCta = !user
    ? { text: "Create an account", href: "/register" }
    : user.role === "buyer"
      ? { text: "Browse crops", href: "/buyer" }
      : user.role === "farmer"
        ? { text: "Manage listings", href: "/farmer" }
        : { text: "Open admin", href: "/admin" };

  return (
    <div>
      {/* HERO SPLIT */}
      <section className="hero">
        <div className="hero-inner">
          <div>
            <h1 className="hero-title">Kenya’s direct crop market.</h1>
            <div className="hero-tagline">List • Request • Trade</div>
            <p className="hero-sub">
              Buy and sell crops directly — transparent pricing, location-based listings,
              order requests, and admin oversight to keep the marketplace trustworthy.
            </p>

            <div className="row" style={{ marginTop: 14 }}>
              <span className="pill">Use the top menu to Login / Register</span>
            </div>

            <div className="hero-highlights">
              <span className="pill">No middlemen</span>
              <span className="pill">Units: kg / bag</span>
              <span className="pill">Direct order requests</span>
              <span className="pill">Verification + reports (next)</span>
            </div>

            <p className="small" style={{ marginTop: 12 }}>
              Farmers earn more. Buyers reduce procurement costs. Prices become transparent.
            </p>
          </div>

          <div className="hero-media">
            <img src="/hero.jpeg" alt="Agribusiness marketplace" />
          </div>
        </div>
      </section>

      {/* WHAT YOU CAN DO (not everything is a card) */}
      <section className="section">
        <div className="split">
          <div>
            <div className="section-title">Built for real trading</div>
            <div className="section-headline">Clear roles. Simple workflow.</div>
            <p className="small">
              This platform removes brokers and connects farmers to buyers like restaurants,
              wholesalers, and retailers. Admin keeps the system safe and organized.
            </p>
            <p className="small">
              Next upgrades: crop images, geolocation distance filtering, verification badges, packaging metadata, and reports.
            </p>
          </div>

          <div className="card">
            <div className="section-title">How it works</div>
            <div className="small">
              <ol style={{ margin: "8px 0 0", paddingLeft: 18, lineHeight: 1.8 }}>
                <li>Farmer lists crop (quantity is numeric + unit)</li>
                <li>Buyer browses and sends order request</li>
                <li>Farmer accepts/rejects/completes</li>
                <li>Admin monitors & reports</li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* ROLE CARDS (cards only where useful) */}
      <section className="section">
        <div className="section-title">What each user can do</div>

        <div className="roles">
          <div className="card">
            <div className="kv">
              <strong>Farmer</strong>
              <span className="pill">Sell directly</span>
            </div>
            <div className="small" style={{ marginTop: 8 }}>
              • Create crop listings (name, quantity+unit, price/unit, location)<br />
              • Add crop images (upgrade)<br />
              • Set GPS location / county-town (upgrade)<br />
              • Manage incoming orders and statuses
            </div>
            <div className="row" style={{ marginTop: 12 }}>
              <Link className="btn primary" to="/register">Register as Farmer</Link>
            </div>
          </div>

          <div className="card">
            <div className="kv">
              <strong>Buyer</strong>
              <span className="pill">Source smarter</span>
            </div>
            <div className="small" style={{ marginTop: 8 }}>
              • Browse + filter listings by name, location, price<br />
              • Request orders using numeric quantity<br />
              • Track order status updates<br />
              • Filter by distance (geolocation upgrade)
            </div>
            <div className="row" style={{ marginTop: 12 }}>
              <Link className="btn primary" to="/register">Register as Buyer</Link>
            </div>
          </div>

          <div className="card">
            <div className="kv">
              <strong>Admin</strong>
              <span className="pill">Trust & safety</span>
            </div>
            <div className="small" style={{ marginTop: 8 }}>
              • Activate/deactivate users<br />
              • Moderate listings<br />
              • Verify farmers/buyers (upgrade)<br />
              • Reports & analytics (upgrade)
            </div>
            <div className="row" style={{ marginTop: 12 }}>
              <Link className="btn secondary" to="/login">Admin Login</Link>
            </div>
          </div>
        </div>
      </section>

      {/* IMAGE STRIP */}
      <section className="section">
        <div className="section-title">From the farm</div>
        <div className="section-headline">A marketplace that feels real</div>
        <p className="small">
          Add a few farming images here to make the site feel alive. This is a simple scrollable gallery.
        </p>

        <div className="gallery-strip" style={{ marginTop: 12 }}>
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
        <span className="pill">Scroll →</span>
        <p className="small" style={{ marginTop: 10 }}>
          Tip: put images in <code>frontend/public/</code> as <code>gallery1.jpeg</code>, <code>gallery2.jpeg</code>, <code>gallery3.jpeg</code>.
        </p>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-col">
            <div className="footer-title">🌾 Crop Marketplace</div>
            <div className="small">
              Direct trading platform for farmers and buyers with transparent pricing,
              order requests, and admin oversight.
            </div>
          </div>

          <div className="footer-col">
            <div className="footer-title">Platform</div>
            <Link to="/">Home</Link>
            <Link to="/register">Register</Link>
            <Link to="/login">Login</Link>
          </div>

          <div className="footer-col">
            <div className="footer-title">Roles</div>
            <Link to="/register">Farmer</Link>
            <Link to="/register">Buyer</Link>
            <Link to="/login">Admin</Link>
          </div>

          <div className="footer-col">
            <div className="footer-title">Coming soon</div>
            <a href="#!" onClick={(e) => e.preventDefault()}>Verification badges</a>
            <a href="#!" onClick={(e) => e.preventDefault()}>Geolocation filter</a>
            <a href="#!" onClick={(e) => e.preventDefault()}>Reports & CSV export</a>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="footer-bottom-inner">
            <span>© {new Date().getFullYear()} Crop Marketplace</span>
            <span className="pill">@Copyright</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
