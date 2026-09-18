export type Product = {
  id: string;
  title: string;
  description: string;
  pricePence: number | null;
  isAvailable: boolean;
  isVisible: boolean;
  images: ProductImage[];
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type ProductImage = { id: string; imageUrl: string; sortOrder: number };
export type DeleteAllImagesResponse = { product: Product; deletedImageIds: string[]; failed: Array<{ imageId: string; storagePath: string; message: string }> };

type LoginResponse = { accessToken: string };
type ProductInput = {
  title: string;
  description: string;
  isVisible: boolean;
  pricePence?: number;
  isAvailable: boolean;
  sortOrder: number;
};

const TOKEN_KEY = "sweet-bouquets-admin-token";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function getToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function hasToken() {
  return Boolean(getToken());
}

export function storeToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (!(options.body instanceof FormData)) headers.set("Content-Type", "application/json");

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (response.status === 401) {
    clearToken();
    if (typeof window !== "undefined" && window.location.pathname !== "/admin/login") {
      window.location.assign("/admin/login");
    }
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      typeof body?.message === "string"
        ? body.message
        : Array.isArray(body?.message)
          ? body.message.join(", ")
          : "The request could not be completed";
    throw new ApiError(message, response.status);
  }
  return body as T;
}

export const api = {
  login(email: string, password: string) {
    return request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },
  listProducts() {
    return request<Product[]>("/products/admin");
  },
  listPublicProducts() {
    return request<Product[]>("/products");
  },
  createProduct(input: ProductInput) {
    return request<Product>("/products", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  updateProduct(id: string, input: ProductInput) {
    return request<Product>(`/products/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  },
  deleteProduct(id: string) {
    return request<Product>(`/products/${id}`, { method: "DELETE" });
  },
  uploadImages(id: string, files: File[]) {
    const body = new FormData();
    files.forEach((file) => body.append("images", file));
    return request<{ product: Product; uploaded: Array<{ fileName: string; imageUrl: string }>; failed: Array<{ fileName: string; message: string }> }>(`/products/${id}/images`, {
      method: "POST",
      body,
    });
  },
  deleteImage(id: string, imageId: string) {
    return request<Product>(`/products/${id}/images/${imageId}`, { method: "DELETE" });
  },
  deleteAllImages(id: string) {
    return request<DeleteAllImagesResponse>(`/products/${id}/images`, { method: "DELETE" });
  },
  reorderImages(id: string, imageIds: string[]) {
    return request<Product>(`/products/${id}/images/order`, { method: "PATCH", body: JSON.stringify({ imageIds }) });
  },
};