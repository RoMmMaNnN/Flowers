"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { api, Product } from "@/lib/api";

const orderEmail = process.env.NEXT_PUBLIC_ORDER_EMAIL?.trim() ?? "";

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
    if (!orderEmail) {
      setOrderMessage("Ordering email is not configured yet. Please check back soon.");
      return;
    }
    const subject = `Order enquiry: ${product.title}`;
    const body = [
      `Hello, I would like to ask about the availability of ${product.title}.`,
      "",
      `Product: ${product.title}`,
      `Description: ${product.description}`,
      "",
      "I would love to discuss availability and any customisation options.",
      "",
      "My name:",
      "My contact details:",
    ].join("\n");
    window.location.href = `mailto:${orderEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  return (
    <main className="public-site">
      <header className="site-header">
        <a className="brand-mark" href="#top" onClick={() => setMenuOpen(false)}><span className="brand-dot" aria-hidden="true" />Sweet Bouquets</a>
        <button className="menu-toggle" type="button" aria-expanded={menuOpen} aria-controls="site-navigation" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? "Close" : "Menu"}</button>
        <nav id="site-navigation" className={menuOpen ? "site-nav open" : "site-nav"} aria-label="Main navigation">
          <a href="#top" onClick={() => setMenuOpen(false)}>Home</a>
          <a href="#products" onClick={() => setMenuOpen(false)}>Products</a>
          <a href="#about" onClick={() => setMenuOpen(false)}>About</a>
          <a href="#contact" onClick={() => setMenuOpen(false)}>Contact</a>
        </nav>
      </header>

      <section className="hero-section" id="top">
        <div className="hero-copy">
          <p className="eyebrow">Small gifts, big feeling</p>
          <h1>Sweet things, gathered beautifully.</h1>
          <p className="hero-intro">Handmade bouquets of chocolates and treats, arranged to make an ordinary moment feel wonderfully considered.</p>
          <div className="hero-actions"><a className="primary-cta" href="#products">Explore the collection <span aria-hidden="true">↓</span></a><a className="secondary-cta" href="#contact">Plan a gift</a></div>
        </div>
        <div className="hero-art" aria-label="A selection of sweet bouquet treats">
          {products[0]?.imageUrl ? <Image src={products[0].imageUrl} alt="" fill priority sizes="(max-width: 760px) 90vw, 48vw" /> : <div className="hero-still-life" aria-hidden="true"><span className="hero-ribbon">made to be remembered</span><span className="hero-chocolate chocolate-one">cocoa</span><span className="hero-chocolate chocolate-two">sweet</span><span className="hero-chocolate chocolate-three">love</span><span className="hero-stem stem-one" /><span className="hero-stem stem-two" /><span className="hero-stem stem-three" /></div>}
          <div className="hero-caption"><span>01</span> A little joy, wrapped by hand</div>
        </div>
      </section>

      <section className="intro-band" id="about"><p className="section-label">The sweet idea</p><div><h2>A bouquet that gets opened twice.</h2><p>We pair the charm of flowers with the delight of favourite sweets, creating custom gifts for birthdays, thank-yous, celebrations, and the moments that deserve a little extra attention.</p></div></section>

      <section className="catalogue-section" id="products" aria-labelledby="products-title">
        <div className="section-heading public-heading"><div><p className="section-label">The collection</p><h2 id="products-title">Choose a little sweetness.</h2></div><p className="section-aside">Every arrangement is prepared to order.</p></div>
        {isLoading && <div className="catalogue-message" role="status">Gathering the collection...</div>}
        {error && <div className="catalogue-message error-message" role="alert">{error}</div>}
        {!isLoading && !error && products.length === 0 && <div className="catalogue-message">New bouquets are being prepared. Please check back soon.</div>}
        {!isLoading && !error && products.length > 0 && <div className="public-product-grid">{products.map((product) => <ProductCard key={product.id} product={product} onOrder={handleOrder} />)}</div>}
        {orderMessage && <p className="order-message" role="status">{orderMessage}</p>}
      </section>

      <section className="contact-section" id="contact"><div><p className="section-label">Make it personal</p><h2>Have someone in mind?</h2></div><div className="contact-copy"><p>Tell us who you are celebrating and what you have in mind. We can talk through availability, flavours, and a thoughtful arrangement.</p>{orderEmail ? <a className="primary-cta light-cta" href={`mailto:${orderEmail}?subject=${encodeURIComponent("Sweet bouquet enquiry")}`}>Start an enquiry <span aria-hidden="true">↗</span></a> : <p className="contact-note">Our ordering email will be available here soon.</p>}</div></section>
      <footer className="site-footer"><a className="brand-mark" href="#top"><span className="brand-dot" aria-hidden="true" />Sweet Bouquets</a><p>Handmade sweet gifts for meaningful moments.</p><nav aria-label="Footer navigation"><a href="#products">Products</a><a href="#about">About</a><a href="#contact">Contact</a></nav></footer>
    </main>
  );
}

function ProductCard({ product, onOrder }: { product: Product; onOrder: (product: Product) => void }) {
  const [imageBroken, setImageBroken] = useState(false);
  return <article className="public-product-card"><div className="public-product-image">{product.imageUrl && !imageBroken ? <Image src={product.imageUrl} alt={`${product.title} sweet bouquet`} fill sizes="(max-width: 760px) 100vw, (max-width: 1100px) 50vw, 33vw" onError={() => setImageBroken(true)} /> : <div className="image-placeholder" aria-label="Image coming soon"><span aria-hidden="true">SB</span><small>Image coming soon</small></div>}<span className="image-index" aria-hidden="true">{String(product.sortOrder + 1).padStart(2, "0")}</span></div><div className="public-product-copy"><h3>{product.title}</h3><p>{product.description}</p><button className="order-button" type="button" onClick={() => onOrder(product)}>Order this bouquet <span aria-hidden="true">↗</span></button></div></article>;
}
