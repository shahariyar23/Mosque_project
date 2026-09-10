"use client";

import { apiDeleteRaw, apiGetRaw, apiPatchRaw, apiUploadRaw } from "./apiClient";

export type GalleryItem = {
  id: string;
  mosqueId: string;
  imageUrl: string;
  cloudinaryPublicId: string | null;
  title: string | null;
  altText: string | null;
  category: string;
  sortOrder: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateGalleryItemInput = {
  file: File;
  title?: string;
  altText?: string;
  category?: string;
  sortOrder?: number;
  isPublished?: boolean;
};

export type UpdateGalleryItemInput = {
  title?: string;
  altText?: string;
  category?: string;
  sortOrder?: number;
  isPublished?: boolean;
};

export function fetchGalleryItems(): Promise<GalleryItem[]> {
  return apiGetRaw<GalleryItem[]>("/mosque/gallery");
}

export function uploadGalleryPhoto(input: CreateGalleryItemInput): Promise<GalleryItem> {
  const formData = new FormData();
  formData.append("file", input.file);
  if (input.title) formData.append("title", input.title);
  if (input.altText) formData.append("altText", input.altText);
  if (input.category) formData.append("category", input.category);
  if (input.sortOrder !== undefined) formData.append("sortOrder", String(input.sortOrder));
  if (input.isPublished !== undefined) formData.append("isPublished", String(input.isPublished));

  return apiUploadRaw<GalleryItem>("/mosque/gallery", formData);
}

export function updateGalleryItem(id: string, input: UpdateGalleryItemInput): Promise<GalleryItem> {
  return apiPatchRaw<GalleryItem>(`/mosque/gallery/${id}`, input);
}

export function deleteGalleryItem(id: string): Promise<void> {
  return apiDeleteRaw<void>(`/mosque/gallery/${id}`);
}
