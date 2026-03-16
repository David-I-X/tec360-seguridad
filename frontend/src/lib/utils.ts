import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getImageUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:')) return url;
  
  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, "") || "https://tec-360.tech";
  return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
}

export function getAvatarUrl(url?: string | null): string | undefined {
  return getImageUrl(url);
}
