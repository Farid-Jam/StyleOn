export interface Product {
  id: string;
  name: string;
  brand?: string | null;
  category: string;
  subcategory?: string | null;
  gender_fit?: string | null;
  colors?: string[] | string | null;
  season_palette?: string[] | string | null;
  aesthetic_tags?: string[] | string | null;
  available_sizes?: string[] | string | null;
  material?: string | null;
  price?: number | null;
  currency?: string | null;
  image_url?: string | null;
  try_on_ready_image_url?: string | null;
  product_url?: string | null;
  source?: string | null;
  description?: string | null;
  in_stock?: boolean;
}

export interface BodyMetrics {
  shoulderWidth: string;
  hipWidth: string;
  torsoLength: string;
  shoulderToHipRatio: string;
  build: string;
}

export function parseSizes(raw: Product['available_sizes']): string[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      /* swallow */
    }
    throw new Error(message);
  }
  return res.json();
}

export function getProducts(category?: string): Promise<Product[]> {
  const params = category ? `?category=${encodeURIComponent(category)}` : '';
  return fetchJson<Product[]>(`/api/products${params}`);
}

export function getProduct(id: string): Promise<Product> {
  return fetchJson<Product>(`/api/products/${encodeURIComponent(id)}`);
}

export async function fetchImageAsDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not load garment image (${res.status}).`);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Could not read garment image.'));
    reader.readAsDataURL(blob);
  });
}

export interface TryOnRequest {
  personImage: string;
  garmentImage: string;
  size?: string | null;
  height?: string | null;
  bodyMetrics?: BodyMetrics | null;
}

export async function generateTryOn(req: TryOnRequest): Promise<string> {
  const { image } = await fetchJson<{ image: string }>('/api/try-on', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  return image;
}

export async function getFitRecommendation(personImage: string, height: string): Promise<string> {
  const { text } = await fetchJson<{ text: string }>('/api/fit-recommendation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ personImage, height }),
  });
  return text;
}
