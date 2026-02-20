import { apiFetchJSON, postJSON, putJSON, deleteJSON } from "../lib/api";
import { Product } from "../types";

export const productService = {
    async getAll() {
        return apiFetchJSON<Product[]>("/api/products");
    },

    async getByBarcode(barcode: string) {
        return apiFetchJSON<Product>(`/api/products/by-barcode/${encodeURIComponent(barcode)}`);
    },

    async create(product: Partial<Product>) {
        return postJSON<Product>("/api/products", product);
    },

    async update(id: string | number, product: Partial<Product>) {
        return putJSON<Product>(`/api/products/${id}`, product);
    },

    async delete(id: string | number) {
        return deleteJSON(`/api/products/${id}`);
    },

    async searchExternal(barcode: string) {
        return apiFetchJSON<any>(`/api/products/google-search?barcode=${encodeURIComponent(barcode)}`);
    },

    async updateStatus(id: string | number, status: string) {
        return apiFetchJSON(`/api/products/${id}/estado`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ estado: status }),
        });
    }
};
