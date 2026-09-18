"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError, clearToken, hasToken, Product } from "@/lib/api";

type ProductForm = {
  title: string;
  description: string;
  sortOrder: string;
  isVisible: boolean;
  pricePence: string;
  isAvailable: boolean;
};

const emptyForm: ProductForm = { title: "", description: "", sortOrder: "0", isVisible: true, pricePence: "", isAvailable: true };

function productToForm(product: Product): ProductForm {
  return {
    title: product.title,
    description: product.description,
    sortOrder: String(product.sortOrder),
    isVisible: product.isVisible,
    pricePence: product.pricePence === null ? "" : String(product.pricePence),
    isAvailable: product.isAvailable,
  };
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!hasToken()) {
      router.replace("/admin/login");
      return;
    }
    void loadProducts();
  }, [router]);

  async function loadProducts() {
    setLoading(true);
    setError("");
    try {
      setProducts(await api.listProducts());
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) return;
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setNotice("");
  }

  function startEdit(product: Product) {
    setEditingId(product.id);
    setForm(productToForm(product));
    setError("");
    setNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setSaving(true);
    const input = {
      title: form.title.trim(),
      description: form.description.trim(),
      sortOrder: Number(form.sortOrder),
      isVisible: form.isVisible,
      pricePence: form.pricePence.trim() === "" ? undefined : Number(form.pricePence),
      isAvailable: form.isAvailable,
    };
    if (!input.title || !input.description || !Number.isInteger(input.sortOrder) || input.sortOrder < 0 || (input.pricePence !== undefined && (!Number.isInteger(input.pricePence) || input.pricePence < 0))) {
      setError("Add a title, description, valid sort order, and a non-negative price in pence if needed.");
      setSaving(false);
      return;
    }

    try {
      if (editingId) await api.updateProduct(editingId, input);
      else await api.createProduct(input);
      await loadProducts();
      setEditingId(null);
      setForm(emptyForm);
      setNotice(editingId ? "Product updated." : "Product created.");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(product: Product) {
    if (!window.confirm(`Delete “${product.title}”? This cannot be undone.`)) return;
    setBusyId(product.id);
    setError("");
    try {
      await api.deleteProduct(product.id);
      if (editingId === product.id) startCreate();
      await loadProducts();
      setNotice("Product deleted.");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusyId(null);
    }
  }

  async function handleImageUpload(productId: string, event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;
    setBusyId(productId);
    setError("");
    try {
      const result = await api.uploadImages(productId, files);
      await loadProducts();
      setNotice(`${result.uploaded.length} image(s) uploaded${result.failed.length ? `; failed: ${result.failed.map((item) => item.fileName).join(", ")}` : "."}`);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusyId(null);
    }
  }

  async function handleImageDelete(product: Product, imageId: string) {
    if (!window.confirm(`Remove this image from “${product.title}”?`)) return;
    setBusyId(product.id);
    setError("");
    try {
      await api.deleteImage(product.id, imageId);
      await loadProducts();
      setNotice("Image removed.");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDeleteAllImages(product: Product) {
    if (!window.confirm(`Delete all images from “${product.title}”?`)) return;
    setBusyId(product.id);
    try {
      const result = await api.deleteAllImages(product.id);
      await loadProducts();
      setNotice(result.failed.length ? `${result.deletedImageIds.length} image(s) removed; ${result.failed.length} could not be removed.` : "All images removed.");
    } catch (requestError) { setError(getErrorMessage(requestError)); } finally { setBusyId(null); }
  }

  async function moveImage(product: Product, index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= product.images.length) return;
    const imageIds = product.images.map((image) => image.id);
    [imageIds[index], imageIds[target]] = [imageIds[target], imageIds[index]];
    setBusyId(product.id);
    try { await api.reorderImages(product.id, imageIds); await loadProducts(); } catch (requestError) { setError(getErrorMessage(requestError)); } finally { setBusyId(null); }
  }

  function logout() {
    clearToken();
    router.replace("/admin/login");
  }

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Sweet Bouquets / Admin</p>
          <h1>Catalogue desk</h1>
        </div>
        <button className="quiet-button" type="button" onClick={logout}>Log out</button>
      </header>

      <section className="workspace-grid">
        <section className="editor-panel" aria-labelledby="editor-title">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Product editor</p>
              <h2 id="editor-title">{editingId ? "Refine a bouquet" : "Add a bouquet"}</h2>
            </div>
            {editingId && <button className="text-button" type="button" onClick={startCreate}>New product</button>}
          </div>
          <form className="stack-form" onSubmit={handleSubmit}>
            <label>
              Title
              <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
            </label>
            <label>
              Description
              <textarea rows={4} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} required />
            </label>
            <div className="form-row">
              <label>
                Price (pence)
                <input type="number" min="0" step="1" value={form.pricePence} onChange={(event) => setForm({ ...form, pricePence: event.target.value })} placeholder="Optional" />
              </label>
              <label>
                Sort order
                <input type="number" min="0" step="1" value={form.sortOrder} onChange={(event) => setForm({ ...form, sortOrder: event.target.value })} required />
              </label>
              <label className="toggle-label">
                <span>Visible publicly</span>
                <input type="checkbox" checked={form.isVisible} onChange={(event) => setForm({ ...form, isVisible: event.target.checked })} />
              </label>
              <label className="toggle-label"><span>Available to order</span><input type="checkbox" checked={form.isAvailable} onChange={(event) => setForm({ ...form, isAvailable: event.target.checked })} /></label>
            </div>
            <button className="primary-button" type="submit" disabled={saving}>
              {saving ? "Saving..." : editingId ? "Save changes" : "Create product"}
            </button>
          </form>
        </section>

        <section className="catalogue-panel" aria-labelledby="catalogue-title">
          <div className="section-heading">
            <div>
              <p className="section-kicker">All products</p>
              <h2 id="catalogue-title">The shelf</h2>
            </div>
            <span className="count-badge">{products.length}</span>
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          {notice && <p className="form-notice" role="status">{notice}</p>}
          {loading ? (
            <p className="empty-state">Loading the catalogue...</p>
          ) : products.length === 0 ? (
            <p className="empty-state">No products yet. Add the first bouquet.</p>
          ) : (
            <div className="product-list">
              {products.map((product) => (
                <article className="product-row" key={product.id}>
                  <div className="product-image">
                    {product.images[0] ? <img src={product.images[0].imageUrl} alt="" /> : <span aria-hidden="true">SB</span>}
                  </div>
                  <div className="product-details">
                    <div className="product-title-line">
                      <h3>{product.title}</h3>
                      <span className={product.isVisible ? "status-pill visible" : "status-pill hidden"}>{product.isVisible ? "Visible" : "Hidden"}</span>
                      <span className={product.isAvailable ? "status-pill visible" : "status-pill hidden"}>{product.isAvailable ? "Available" : "Unavailable"}</span>
                    </div>
                    <p>{product.description}</p>
                    <small>Sort order {product.sortOrder} {product.pricePence === null ? "· Price not set" : `· £${(product.pricePence / 100).toFixed(2)}`}</small>
                    {product.images.length > 0 && <div className="admin-image-strip">{product.images.map((image, index) => <div className="admin-image-thumb" key={image.id}><img src={image.imageUrl} alt="" /><small>{index === 0 ? "Primary" : `Image ${index + 1}`}</small><button className="text-button" type="button" onClick={() => void moveImage(product, index, -1)} disabled={busyId === product.id || index === 0}>←</button><button className="text-button" type="button" onClick={() => void moveImage(product, index, 1)} disabled={busyId === product.id || index === product.images.length - 1}>→</button><button className="text-button danger-text" type="button" onClick={() => void handleImageDelete(product, image.id)} disabled={busyId === product.id}>Delete</button></div>)}</div>}
                    <div className="row-actions">
                      <button className="text-button" type="button" onClick={() => startEdit(product)}>Edit</button>
                      <label className="text-button file-button">
                        {busyId === product.id ? "Working..." : "Add images"}
                        <input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={(event) => void handleImageUpload(product.id, event)} disabled={busyId === product.id} />
                      </label>
                      {product.images.length > 0 && <button className="text-button danger-text" type="button" onClick={() => void handleDeleteAllImages(product)} disabled={busyId === product.id}>Delete all images</button>}
                      <button className="text-button danger-text" type="button" onClick={() => void handleDelete(product)} disabled={busyId === product.id}>Delete</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError && error.status === 401) return "Your session has expired. Please sign in again.";
  return error instanceof ApiError ? error.message : "Something went wrong. Please try again.";
}
