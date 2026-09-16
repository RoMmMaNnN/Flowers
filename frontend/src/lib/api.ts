export type Product = {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  isVisible: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

type LoginResponse = { accessToken: string };
type ProductInput = {
  title: string;
  description: string;
  isVisible: boolean;
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
  uploadImage(id: string, file: File) {
    const body = new FormData();
    body.append("image", file);
    return request<Product>(`/products/${id}/image`, {
      method: "POST",
      body,
    });
  },
  deleteImage(id: string) {
    return request<Product>(`/products/${id}/image`, { method: "DELETE" });
  },
};