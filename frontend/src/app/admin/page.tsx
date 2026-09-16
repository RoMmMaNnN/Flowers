"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError, clearToken, hasToken, Product } from "@/lib/api";

type ProductForm = {
  title: string;
  description: string;
  sortOrder: string;
  isVisible: boolean;
};

const emptyForm: ProductForm = { title: "", description: "", sortOrder: "0", isVisible: true };

function productToForm(product: Product): ProductForm {
  return {
    title: product.title,
    description: product.description,
    sortOrder: String(product.sortOrder),
    isVisible: product.isVisible,
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
    };
    if (!input.title || !input.description || !Number.isInteger(input.sortOrder) || input.sortOrder < 0) {
      setError("Add a title, description, and a whole number sort order.");
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
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusyId(productId);
    setError("");
    try {
      await api.uploadImage(productId, file);
      await loadProducts();
      setNotice("Image uploaded.");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusyId(null);
    }
  }

  async function handleImageDelete(product: Product) {
    if (!window.confirm(`Remove the image from “${product.title}”?`)) return;
    setBusyId(product.id);
    setError("");
    try {
      await api.deleteImage(product.id);
      await loadProducts();
      setNotice("Image removed.");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusyId(null);
    }
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
                Sort order
                <input type="number" min="0" step="1" value={form.sortOrder} onChange={(event) => setForm({ ...form, sortOrder: event.target.value })} required />
              </label>
              <label className="toggle-label">
                <span>Visible publicly</span>
                <input type="checkbox" checked={form.isVisible} onChange={(event) => setForm({ ...form, isVisible: event.target.checked })} />
              </label>
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
                    {product.imageUrl ? <img src={product.imageUrl} alt="" /> : <span aria-hidden="true">SB</span>}
                  </div>
                  <div className="product-details">
                    <div className="product-title-line">
                      <h3>{product.title}</h3>
                      <span className={product.isVisible ? "status-pill visible" : "status-pill hidden"}>{product.isVisible ? "Visible" : "Hidden"}</span>
                    </div>
                    <p>{product.description}</p>
                    <small>Sort order {product.sortOrder}</small>
                    <div className="row-actions">
                      <button className="text-button" type="button" onClick={() => startEdit(product)}>Edit</button>
                      <label className="text-button file-button">
                        {busyId === product.id ? "Working..." : product.imageUrl ? "Replace image" : "Add image"}
                        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void handleImageUpload(product.id, event)} disabled={busyId === product.id} />
                      </label>
                      {product.imageUrl && <button className="text-button danger-text" type="button" onClick={() => void handleImageDelete(product)} disabled={busyId === product.id}>Remove image</button>}
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
