"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { api, Product } from "@/lib/api";
import { formatPhoneForDisplay, phoneHref, productEnquiryHref, siteConfig, whatsAppHref } from "@/lib/site-config";

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [orderMessage, setOrderMessage] = useState("");
  const [heroImageBroken, setHeroImageBroken] = useState(false);

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

  function handleOrder(product: Product, quantity: number) {
    const enquiryHref = productEnquiryHref(product, quantity);
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
          <a href="#top" onClick={closeMenu}>Home</a>
          <a href="#about" onClick={closeMenu}>Our approach</a>
          <a href="#products" onClick={closeMenu}>Collection</a>
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
          <div className="hero-art-visual">
            {products[0]?.images[0]?.imageUrl && !heroImageBroken ? <Image src={products[0].images[0].imageUrl} alt="" fill priority sizes="(max-width: 760px) 100vw, 47vw" onError={() => setHeroImageBroken(true)} /> : <div className="hero-image-fallback" aria-hidden="true" />}
          </div>
          <span className="hero-editorial-label">Made to be remembered</span>
          <div className="hero-caption"><span>01 / collection</span><span>A little joy, wrapped by hand</span></div>
        </div>
      </section>

      <section className="intro-band" id="about" aria-labelledby="about-title">
        <p className="section-label">Our approach</p>
        <div className="intro-content"><h2 id="about-title">The charm of flowers. The delight of sweets.</h2><p>We pair the warmth of a hand-finished bouquet with favourite chocolates and treats, creating gifts for celebrations, thank-yous, and the moments that deserve a little extra attention.</p></div>
      </section>

      <section className="catalogue-section" id="products" aria-labelledby="products-title">
        <div className="section-heading public-heading"><div><p className="section-label">The collection</p><h2 id="products-title">Choose a little sweetness.</h2></div><p className="section-aside">Browse the handcrafted bouquets and pick your favourite.</p></div>
        {isLoading && <div className="catalogue-message" role="status">Gathering the collection...</div>}
        {error && <div className="catalogue-message error-message" role="alert">{error}</div>}
        {!isLoading && !error && products.length === 0 && <div className="catalogue-message">New bouquets are being prepared. Please check back soon.</div>}
        {!isLoading && !error && products.length > 0 && <div className="public-product-grid">{products.map((product, index) => <ProductCard key={product.id} product={product} index={index} onOrder={handleOrder} />)}</div>}
        {orderMessage && <p className="order-message" role="status">{orderMessage}</p>}
      </section>

      <section className="contactSection" id="contact" aria-labelledby="contact-title">
        <div className="contactSectionInner">
          <div className="contactHeader">
            <p className="section-label">Order simply</p>
            <h2 id="contact-title">Contact</h2>
            <p className="contactIntro">Have a question or found a favourite? Email us to enquire about a bouquet, check availability, or arrange a thoughtful gift.</p>
          </div>

          <div className="contactContent">
            <div className="contactGrid">
              {siteConfig.phone && (
                <a className="contactCard" href={whatsAppHref(siteConfig.phone)} target="_blank" rel="noopener noreferrer" aria-label="Contact Sweet Bouquets on WhatsApp">
                  <ContactIcon type="whatsapp" />
                  <span className="contactContentBlock">
                    <span className="contactLabel">WhatsApp</span>
                    <span className="contactValue">{formatPhoneForDisplay(siteConfig.phone)}</span>
                    <span className="contactMeta">{siteConfig.whatsappDisplayName}</span>
                  </span>
                </a>
              )}
              {siteConfig.businessEmail && (
                <a className="contactCard" href={`mailto:${siteConfig.businessEmail}`} aria-label="Email Sweet Bouquets">
                  <ContactIcon type="email" />
                  <span className="contactContentBlock">
                    <span className="contactLabel">Email</span>
                    <span className="contactValue">{siteConfig.businessEmail}</span>
                  </span>
                </a>
              )}
              {siteConfig.instagramUrl && (
                <a className="contactCard" href={siteConfig.instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Visit Sweet Bouquets on Instagram">
                  <ContactIcon type="instagram" />
                  <span className="contactContentBlock">
                    <span className="contactLabel">Instagram</span>
                    <span className="contactValue">@Belfastsweetpresentsforeveryone</span>
                  </span>
                </a>
              )}
            </div>

            {siteConfig.businessEmail ? (
              <a className="contactCta" href={`mailto:${siteConfig.businessEmail}?subject=${encodeURIComponent("Sweet bouquet enquiry")}`}>
                Start an enquiry <span aria-hidden="true">↗</span>
              </a>
            ) : (
              <p className="contactNote">Our ordering email will be available here soon.</p>
            )}
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <div className="site-footer-inner">
          <a className="brand-mark" href="#top"><span className="brand-dot" aria-hidden="true" /><span>Sweet Bouquets</span></a>
          <p>Handmade sweet gifts for meaningful moments.</p>
          <nav aria-label="Footer navigation">
            <a href="#top">Home</a>
            <a href="#about">Our approach</a>
            <a href="#products">Collection</a>
            <a href="#contact">Contact</a>
          </nav>
          <div className="footer-contact" aria-label="Contact details">
            {siteConfig.businessEmail && <a href={`mailto:${siteConfig.businessEmail}`}>{siteConfig.businessEmail}</a>}
            {siteConfig.phone && <a href={phoneHref(siteConfig.phone)}>{formatPhoneForDisplay(siteConfig.phone)}</a>}
            {siteConfig.instagramUrl && <a href={siteConfig.instagramUrl} target="_blank" rel="noopener noreferrer">Instagram <span aria-hidden="true">↗</span></a>}
          </div>
        </div>
      </footer>
    </main>
  );
}

function ProductCard({ product, index, onOrder }: { product: Product; index: number; onOrder: (product: Product, quantity: number) => void }) {
  const [imageBroken, setImageBroken] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const priceText = typeof product.pricePence === "number" ? `£${(product.pricePence / 100).toFixed(2)}` : "Price not set";

  function updateQuantity(delta: number) {
    setQuantity((current) => Math.max(1, current + delta));
  }

  return (
    <article className="public-product-card">
      <div className="public-product-image">
        {product.images[0]?.imageUrl && !imageBroken ? <Image src={product.images[0].imageUrl} alt={`${product.title} sweet bouquet`} fill sizes="(max-width: 760px) 100vw, (max-width: 1100px) 50vw, 33vw" onError={() => setImageBroken(true)} /> : <div className="image-placeholder" aria-label="Image coming soon"><span aria-hidden="true">SB</span><small>Image coming soon</small></div>}
        <span className="image-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
      </div>

      <div className="public-product-copy">
        <div className="product-card-meta">
          <span>Sweet bouquet</span>
          <span>{String(index + 1).padStart(2, "0")}</span>
        </div>

        <h3>{product.title}</h3>
        <p className="product-description">{product.description}</p>

        <div className="product-card-bottom">
          <div className="product-price-block" aria-label={`Price for ${product.title}`}>
            <span className="product-price-label">Price</span>
            <span className="product-price-value">{priceText}</span>
          </div>

          <div className={`product-status ${product.isAvailable ? "available" : "unavailable"}`}>
            {product.isAvailable ? "Available" : "Unavailable"}
          </div>

          <div className="product-quantity" aria-label={`Quantity for ${product.title}`}>
            <label className="product-quantity-label" htmlFor={`quantity-${product.id}`}>Quantity</label>
            <div className="quantity-control">
              <button type="button" className="quantity-button" aria-label="Decrease quantity" onClick={() => updateQuantity(-1)} disabled={quantity <= 1}>−</button>
              <input
                id={`quantity-${product.id}`}
                className="quantity-input"
                type="number"
                min={1}
                step={1}
                value={quantity}
                inputMode="numeric"
                onChange={(event) => {
                  const nextValue = Number(event.target.value);
                  setQuantity(Number.isFinite(nextValue) ? Math.max(1, nextValue) : 1);
                }}
              />
              <button type="button" className="quantity-button" aria-label="Increase quantity" onClick={() => updateQuantity(1)}>+</button>
            </div>
          </div>

          <button
            className={`order-button ${product.isAvailable ? "" : "is-muted"}`}
            type="button"
            onClick={() => onOrder(product, quantity)}
          >
            {product.isAvailable ? "Enquire about this bouquet" : "Enquire about availability"}
            <span aria-hidden="true">↗</span>
          </button>
        </div>
      </div>
    </article>
  );
}

function ContactIcon({ type }: { type: "email" | "phone" | "instagram" | "whatsapp" }) {
  if (type === "email") {
    return <span className="contact-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="m3 6 9 7 9-7" /><rect x="3" y="5" width="18" height="14" rx="2" /></svg></span>;
  }
  if (type === "phone") {
    return <span className="contact-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M7.5 3.5 5 5c-.8.5-.9 1.5-.6 2.4 1.7 5.6 5.9 9.8 11.5 11.5.9.3 1.9.2 2.4-.6l1.5-2.5-3.8-2.3-1.8 1.8a15 15 0 0 1-4.5-4.5l1.8-1.8-2.3-3.8Z" /></svg></span>;
  }
  if (type === "whatsapp") {
    return <span className="contact-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M20.2 3.8A11.5 11.5 0 0 0 3.8 19.8L3 21l1.2-.8a11.5 11.5 0 0 0 15.9-16.4Zm-4.7 13.9c-.4.1-1.7.6-2.3.6-.5 0-1.2-.2-3.2-1.1-2.9-1.4-4.7-4.9-4.8-5.1-.1-.2-1.2-1.6-1.2-3.1 0-1.4.7-2.1 1-2.4.3-.2.6-.3.8-.3h.6c.2 0 .5.1.8.6l1 2.4c.1.2.1.4 0 .5l-.5.9c-.1.2-.2.3-.1.5.2.4.8 1.2 1.5 1.9.9.9 1.8 1.3 2.2 1.5.3.1.5.1.7-.1l.9-.9c.2-.2.5-.3.8-.2l2.5.8c.5.2.7.5.6.8-.3 1.1-1.2 1.9-2.2 2.2Zm2.4-8.4c-.2-.2-.5-.3-.9-.2-.2.1-.5.4-.7.6-.2.2-.4.3-.6.2-.2-.1-.8-.3-1.5-.8-.6-.5-1.1-1.1-1.3-1.3-.2-.2-.3-.4-.1-.6.1-.2.3-.5.5-.7.1-.1.2-.2.3-.4.1-.1 0-.3-.1-.4-.1-.1-.8-1.7-1.1-2.2-.2-.5-.4-.4-.6-.4h-.5c-.1 0-.3.1-.5.2-.2.2-.8.8-.8 2.1 0 1.3.8 2.4 1 2.7.2.4 1.9 3.2 4.9 4.2.7.3 1.2.5 1.6.6.7.2 1.3.2 1.7.1.5-.1 1.6-.7 1.8-1.3.2-.6.2-1.1.2-1.3 0-.2-.2-.4-.4-.6Z"/></svg></span>;
  }
  return <span className="contact-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="16" height="16" rx="4" /><circle cx="12" cy="12" r="3.5" /><circle cx="17.2" cy="6.8" r=".8" fill="currentColor" stroke="none" /></svg></span>;
}
