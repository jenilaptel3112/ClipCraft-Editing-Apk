import { CustomFontItem } from '../types/editor';

const DB_NAME = 'ClipCraftFontsDB';
const STORE_NAME = 'custom_fonts';
const DB_VERSION = 1;

// Curated built-in web fonts preloaded via Google Fonts in index.html
export const CURATED_FONTS = [
  { id: 'Bebas Neue', name: 'Bebas Neue', category: 'Display / Punchy', sample: 'VIRAL IMPACT' },
  { id: 'Montserrat', name: 'Montserrat', category: 'Clean Modern', sample: 'Modern Minimal' },
  { id: 'Anton', name: 'Anton', category: 'Ultra Bold', sample: 'POWER TITLE' },
  { id: 'Playfair Display', name: 'Playfair Display', category: 'Editorial Serif', sample: 'Cinematic Elegance' },
  { id: 'Space Mono', name: 'Space Mono', category: 'Cyber Tech', sample: 'CODE_MATRIX_01' },
  { id: 'Bricolage Grotesque', name: 'Bricolage Grotesque', category: 'Trendy Headline', sample: 'VLOG TITLE' },
  { id: 'JetBrains Mono', name: 'JetBrains Mono', category: 'Developer Typewriter', sample: 'function render()' },
  { id: 'Plus Jakarta Sans', name: 'Plus Jakarta Sans', category: 'Clean Sans', sample: 'Clean & Crisp' },
  { id: 'Cinzel', name: 'Cinzel', category: 'Classic Roman', sample: 'MYTHIC EMPIRE' },
];

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

interface StoredFontRecord extends CustomFontItem {
  data: ArrayBuffer;
}

// In-memory registry of loaded custom font names
const loadedFontNames = new Set<string>();

/**
 * Register an ArrayBuffer as a dynamic FontFace into the browser's document.fonts
 */
export async function registerFontFace(name: string, buffer: ArrayBuffer): Promise<boolean> {
  if (typeof window === 'undefined' || !('FontFace' in window)) return false;
  try {
    const fontFace = new FontFace(name, buffer);
    const loaded = await fontFace.load();
    document.fonts.add(loaded);
    loadedFontNames.add(name);
    return true;
  } catch (err) {
    console.error(`Failed to register FontFace "${name}":`, err);
    return false;
  }
}

/**
 * Upload and persist a custom font file (.ttf, .otf, .woff, .woff2)
 */
export async function uploadCustomFontFile(file: File): Promise<CustomFontItem | null> {
  try {
    const rawName = file.name.replace(/\.[^/.]+$/, '').trim();
    // Normalize clean font family name
    const sanitizedName = rawName.replace(/[^a-zA-Z0-9_\-\s]/g, '') || `Font_${Date.now()}`;
    const fontId = `custom-font-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const ext = file.name.split('.').pop()?.toLowerCase() || 'ttf';

    const arrayBuffer = await file.arrayBuffer();
    const success = await registerFontFace(sanitizedName, arrayBuffer);
    if (!success) {
      throw new Error('FontFace failed to parse font buffer');
    }

    const item: StoredFontRecord = {
      id: fontId,
      name: sanitizedName,
      fileName: file.name,
      format: ext,
      uploadedAt: Date.now(),
      data: arrayBuffer,
    };

    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(item);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    return {
      id: item.id,
      name: item.name,
      fileName: item.fileName,
      format: item.format,
      uploadedAt: item.uploadedAt,
    };
  } catch (err) {
    console.error('Failed to upload custom font:', err);
    return null;
  }
}

/**
 * Load and register all stored custom fonts from IndexedDB on startup
 */
export async function initCustomFonts(): Promise<CustomFontItem[]> {
  try {
    const db = await openDB();
    const records = await new Promise<StoredFontRecord[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });

    const items: CustomFontItem[] = [];
    for (const record of records) {
      if (record.name && record.data) {
        await registerFontFace(record.name, record.data);
      }
      items.push({
        id: record.id,
        name: record.name,
        fileName: record.fileName,
        format: record.format,
        uploadedAt: record.uploadedAt,
      });
    }

    return items;
  } catch (err) {
    console.warn('initCustomFonts skipped or failed:', err);
    return [];
  }
}

/**
 * Delete a custom font from IndexedDB
 */
export async function deleteCustomFont(id: string): Promise<boolean> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    return true;
  } catch (err) {
    console.error('Failed to delete custom font:', err);
    return false;
  }
}

/**
 * Check if a font family is loaded and ready for canvas rendering
 */
export async function ensureFontLoaded(fontFamily: string, timeoutMs: number = 800): Promise<boolean> {
  if (typeof document === 'undefined' || !document.fonts) return true;
  try {
    const isLoaded = document.fonts.check(`16px "${fontFamily}"`);
    if (isLoaded) return true;

    // Wait for document.fonts.ready with race timeout
    const readyPromise = document.fonts.ready.then(() => document.fonts.check(`16px "${fontFamily}"`));
    const timeoutPromise = new Promise<boolean>((resolve) => setTimeout(() => resolve(true), timeoutMs));
    return await Promise.race([readyPromise, timeoutPromise]);
  } catch {
    return true;
  }
}
