import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';

const CACHE_KEY = 'timeless-baazar-catalogue';
const CACHE_VERSION = 1;

/**
 * How long a cached catalogue is served before a refetch is forced.
 *
 * Long enough that a cold Render instance never leaves a customer staring at a
 * blank page, short enough that a price change reaches everyone quickly. The
 * cache is only a starting point: a fetch fires on every mount regardless, and
 * replaces what is shown as soon as it lands.
 */
const MAX_AGE_MS = 10 * 60 * 1000;

const readCache = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;

    const cached = JSON.parse(raw);
    if (cached.version !== CACHE_VERSION) return null;

    return cached;
  } catch {
    // Private windows and cleared site data both land here. Not an error.
    return null;
  }
};

const writeCache = (products, categories) => {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ version: CACHE_VERSION, at: Date.now(), products, categories })
    );
  } catch {
    // Quota exceeded, or storage disabled. The app works without the cache.
  }
};

/**
 * The catalogue, from the API, with a local cache in front of it.
 *
 * Render's free tier sleeps after 15 minutes idle and takes roughly a minute to
 * wake. Without the cache, the first customer of the morning would open the
 * shop to a spinner and assume it is broken. With it, they see the previous
 * catalogue immediately and it updates underneath them once the API answers.
 */
export const useProducts = () => {
  const cached = readCache();

  const [products, setProducts] = useState(cached?.products ?? []);
  const [categories, setCategories] = useState(cached?.categories ?? []);

  // Only "loading" when there is nothing at all to show. A stale cache is a
  // better first paint than a spinner.
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState(null);
  const [isStale, setIsStale] = useState(
    Boolean(cached) && Date.now() - cached.at > MAX_AGE_MS
  );

  const load = useCallback(async (signal) => {
    setError(null);

    try {
      const [productData, categoryData] = await Promise.all([
        api.get('/products?limit=100', { signal }),
        api.get('/categories', { signal }),
      ]);

      setProducts(productData.products);
      setCategories(categoryData.categories);
      setIsStale(false);
      writeCache(productData.products, categoryData.categories);
    } catch (err) {
      if (err.name === 'AbortError') return;

      // With a cache in hand this is not a failure the customer needs to see —
      // they carry on shopping and the next load picks up the change.
      setProducts((current) => {
        if (current.length === 0) setError(err.message);
        else setIsStale(true);
        return current;
      });
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  return { products, categories, loading, error, isStale, reload: () => load() };
};

export default useProducts;
