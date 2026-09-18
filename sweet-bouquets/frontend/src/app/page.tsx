"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { api, Product } from "@/lib/api";
import { formatPhoneForDisplay, phoneHref, productEnquiryHref, siteConfig } from "@/lib/site-config";

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [orderMessage, setOrderMessage] = useState("");

  useEffect(() => {
    let isCurrent = true;
    api.listPublicProducts().then((result) => {
      if (isCurrent) setProducts(result);
    }).catch(() => {
      if (isCurrent) setError("We could not load the bouquet collection right now.");
    }).finally(() => {
      if (isCurrent) setIsLoading(false);
    });
    return () => { isCurrent = false; };
  }, []);

  function handleOrder(product: Product) {
    const enquiryHref = productEnquiryHref(product);
    if (!enquiryHref) {
      setOrderMessage("Ordering email is not configured yet. Please check back soon.");
      return;
    }
    window.location.href = enquiryHref;
  }

  const closeMenu = () => setMenuOpen(false);

  return (
    <main className="public-site">
      <header className="site-header">
        <a className="brand-mark" href="#top" onClick={closeMenu}>
          <span className="brand-dot" aria-hidden="true" />
          <span>Sweet Bouquets</span>
        </a>
        <button className="menu-toggle" type="button" aria-expanded={menuOpen} aria-controls="site-navigation" onClick={() => setMenuOpen((open) => !open)}>
          <span className="menu-icon" aria-hidden="true"><span /><span /></span>
          <span>{menuOpen ? "Close" : "Menu"}</span>
        </button>
        <nav id="site-navigation" className={menuOpen ? "site-nav open" : "site-nav"} aria-label="Main navigation">
          <a href="#products" onClick={closeMenu}>Collection</a>
          <a href="#about" onClick={closeMenu}>Our approach</a>
          <a href="#contact" onClick={closeMenu}>Contact</a>
          <a className="nav-cta" href="#contact" onClick={closeMenu}>Make an enquiry <span aria-hidden="true">↗</span></a>
        </nav>
      </header>

      <section className="hero-section" id="top" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow">Handmade sweet gifts</p>
          <h1 id="hero-title">A little joy, gathered by hand.</h1>
          <p className="hero-intro">Thoughtful bouquets of chocolates and treats, arranged to make gifting feel personal and beautifully unexpected.</p>
          <div className="hero-actions">
            <a className="primary-cta" href="#products">Browse the collection <span aria-hidden="true">↓</span></a>
            <a className="secondary-cta" href="#contact">How ordering works</a>
          </div>
          <div className="hero-note"><span aria-hidden="true">✦</span><span>Made for birthdays, thank-yous, and just because.</span></div>
        </div>
        <div className="hero-art" aria-label="A selection of sweet bouquet treats">
          {products[0]?.images[0]?.imageUrl ? <Image src={products[0].images[0].imageUrl} alt="" fill priority sizes="(max-width: 760px) 100vw, 47vw" /> : <div className="hero-still-life" aria-hidden="true"><span className="hero-ribbon">made to be remembered</span><span className="hero-chocolate chocolate-one">cocoa</span><span className="hero-chocolate chocolate-two">sweet</span><span className="hero-chocolate chocolate-three">love</span><span className="hero-stem stem-one" /><span className="hero-stem stem-two" /><span className="hero-stem stem-three" /></div>}
          <div className="hero-caption"><span>01 / collection</span><span>A little joy, wrapped by hand</span></div>
        </div>
      </section>

      <section className="intro-band" id="about" aria-labelledby="about-title">
        <p className="section-label">Our approach</p>
        <div className="intro-content"><h2 id="about-title">The charm of flowers. The delight of sweets.</h2><p>We pair the warmth of a hand-finished bouquet with favourite chocolates and treats, creating gifts for celebrations, thank-yous, and the moments that deserve a little extra attention.</p></div>
      </section>

      <section className="catalogue-section" id="products" aria-labelledby="products-title">
        <div className="section-heading public-heading"><div><p className="section-label">The collection</p><h2 id="products-title">Choose a little sweetness.</h2></div><p className="section-aside">Scroll the collection, then tell us which one caught your eye.</p></div>
        {isLoading && <div className="catalogue-message" role="status">Gathering the collection...</div>}
        {error && <div className="catalogue-message error-message" role="alert">{error}</div>}
        {!isLoading && !error && products.length === 0 && <div className="catalogue-message">New bouquets are being prepared. Please check back soon.</div>}
        {!isLoading && !error && products.length > 0 && <div className="public-product-grid">{products.map((product, index) => <ProductCard key={product.id} product={product} index={index} onOrder={handleOrder} />)}</div>}
        {orderMessage && <p className="order-message" role="status">{orderMessage}</p>}
      </section>

      <section className="contact-section" id="contact" aria-labelledby="contact-title">
        <div className="contact-heading"><p className="section-label">Order simply</p><h2 id="contact-title">Contact</h2><p className="contact-intro">Have a question or found a favourite? Send us an enquiry and we will help you arrange something sweet.</p></div>
        <div className="contact-copy"><div className="contact-methods">
          {siteConfig.businessEmail && <a className="contact-card" href={`mailto:${siteConfig.businessEmail}`}><ContactIcon type="email" /><span className="contact-content"><span className="contact-label">Email</span><span className="contact-value">{siteConfig.businessEmail}</span></span></a>}
          {siteConfig.phone && <a className="contact-card" href={phoneHref(siteConfig.phone)}><ContactIcon type="phone" /><span className="contact-content"><span className="contact-label">Phone</span><span className="contact-value">{formatPhoneForDisplay(siteConfig.phone)}</span></span></a>}
          {siteConfig.instagramUrl && <a className="contact-card" href={siteConfig.instagramUrl} target="_blank" rel="noopener noreferrer"><ContactIcon type="instagram" /><span className="contact-content"><span className="contact-label">Instagram</span><span className="contact-value">Visit our Instagram <span aria-hidden="true">↗</span></span></span></a>}
        </div>{siteConfig.businessEmail ? <a className="contact-cta" href={`mailto:${siteConfig.businessEmail}?subject=${encodeURIComponent("Sweet bouquet enquiry")}`}>Start an enquiry <span aria-hidden="true">↗</span></a> : <p className="contact-note">Our ordering email will be available here soon.</p>}</div>
      </section>

      <footer className="site-footer"><a className="brand-mark" href="#top"><span className="brand-dot" aria-hidden="true" /><span>Sweet Bouquets</span></a><p>Handmade sweet gifts for meaningful moments.</p><nav aria-label="Footer navigation"><a href="#products">Collection</a><a href="#about">Our approach</a><a href="#contact">Contact</a></nav><div className="footer-contact" aria-label="Contact details">{siteConfig.businessEmail && <a href={`mailto:${siteConfig.businessEmail}`}>{siteConfig.businessEmail}</a>}{siteConfig.phone && <a href={phoneHref(siteConfig.phone)}>{formatPhoneForDisplay(siteConfig.phone)}</a>}{siteConfig.instagramUrl && <a href={siteConfig.instagramUrl} target="_blank" rel="noopener noreferrer">Instagram <span aria-hidden="true">↗</span></a>}</div></footer>
    </main>
  );
}

function ProductCard({ product, index, onOrder }: { product: Product; index: number; onOrder: (product: Product) => void }) {
  const [imageBroken, setImageBroken] = useState(false);
  return (
    <article className="public-product-card">
      <div className="public-product-image">
        {product.images[0]?.imageUrl && !imageBroken ? <Image src={product.images[0].imageUrl} alt={`${product.title} sweet bouquet`} fill sizes="(max-width: 760px) 100vw, (max-width: 1100px) 50vw, 33vw" onError={() => setImageBroken(true)} /> : <div className="image-placeholder" aria-label="Image coming soon"><span aria-hidden="true">SB</span><small>Image coming soon</small></div>}
        <span className="image-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
      </div>
      <div className="public-product-copy"><div className="product-card-meta"><span>Sweet bouquet</span><span>{String(index + 1).padStart(2, "0")}</span></div><h3>{product.title}</h3><p className="product-description">{product.description}</p><div className="product-card-bottom"><div className="product-price">{product.pricePence === null ? "Price not set" : `£${(product.pricePence / 100).toFixed(2)}`}</div>{product.isAvailable ? <button className="order-button" type="button" onClick={() => onOrder(product)}>Enquire about this bouquet <span aria-hidden="true">↗</span></button> : <div className="unavailable-state">Unavailable</div>}</div></div>
    </article>
  );
}

function ContactIcon({ type }: { type: "email" | "phone" | "instagram" }) {
  if (type === "email") {
    return <span className="contact-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="m3 6 9 7 9-7" /><rect x="3" y="5" width="18" height="14" rx="2" /></svg></span>;
  }
  if (type === "phone") {
    return <span className="contact-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M7.5 3.5 5 5c-.8.5-.9 1.5-.6 2.4 1.7 5.6 5.9 9.8 11.5 11.5.9.3 1.9.2 2.4-.6l1.5-2.5-3.8-2.3-1.8 1.8a15 15 0 0 1-4.5-4.5l1.8-1.8-2.3-3.8Z" /></svg></span>;
  }
  return <span className="contact-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="16" height="16" rx="4" /><circle cx="12" cy="12" r="3.5" /><circle cx="17.2" cy="6.8" r=".8" fill="currentColor" stroke="none" /></svg></span>;
}
