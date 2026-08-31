import { useCallback, useEffect, useRef, useState } from 'react';
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

/**
 * Waking a sleeping Render container.
 *
 * A cold instance does not answer slowly -- it refuses the connection outright
 * until Node is listening, so the first fetch of the morning fails in about a
 * second and the customer with no cache gets "could not load the shop" for a
 * shop that is merely booting. These retries sit out that boot: six tries, six
 * seconds apart, is a little over half a minute of patience against a wake that
 * takes roughly one.
 *
 * WAKING_AFTER_MS is when we stop pretending it is a normal load and say what
 * is happening. Four seconds is past every healthy response and well short of
 * the point where a silent skeleton reads as broken.
 */
const COLD_START_RETRIES = 6;
const RETRY_DELAY_MS = 6000;
const WAKING_AFTER_MS = 4000;

const sleep = (ms, signal) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        const error = new Error('Aborted');
        error.name = 'AbortError';
        reject(error);
      },
      { once: true }
    );
  });

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

  // The API is awake but slow to get there, and the page has nothing to show
  // meanwhile. Screens use it to explain the wait instead of holding a
  // skeleton that looks stuck.
  const [waking, setWaking] = useState(false);

  /**
   * True once there is something on screen -- from the cache at mount, or from
   * a load that landed. It decides whether a failure is worth waiting out: with
   * a catalogue already shown the customer carries on shopping and the next
   * load picks up the change, so retrying would only spin. With a blank page it
   * is the difference between the shop opening and the shop looking shut.
   */
  const hasData = useRef(Boolean(cached));

  const load = useCallback(async (signal) => {
    setError(null);

    // Say "waking" only if this turns into a wait, and only on a blank page.
    const announce = setTimeout(() => {
      if (!hasData.current) setWaking(true);
    }, WAKING_AFTER_MS);

    try {
      for (let attempt = 0; ; attempt += 1) {
        try {
          const [productData, categoryData] = await Promise.all([
            api.get('/products?limit=100', { signal }),
            api.get('/categories', { signal }),
          ]);

          setProducts(productData.products);
          setCategories(categoryData.categories);
          setIsStale(false);
          setWaking(false);
          hasData.current = productData.products.length > 0;
          writeCache(productData.products, categoryData.categories);
          return;
        } catch (err) {
          if (err.name === 'AbortError') return;

          // status 0 is the client's own "could not reach it" -- a sleeping
          // instance, or no connection. Either way, worth another try when
          // there is nothing to show; a 4xx or 5xx is the server answering and
          // retrying it would just repeat the same answer.
          const unreachable = err.status === 0;
          if (unreachable && !hasData.current && attempt < COLD_START_RETRIES) {
            setWaking(true);
            try {
              await sleep(RETRY_DELAY_MS, signal);
            } catch {
              // Aborted mid-wait: the screen has moved on.
              return;
            }
            continue;
          }

          // With a cache in hand this is not a failure the customer needs to
          // see — they carry on shopping and the next load picks up the change.
          setProducts((current) => {
            if (current.length === 0) setError(err.message);
            else setIsStale(true);
            return current;
          });
          return;
        }
      }
    } finally {
      clearTimeout(announce);
      if (!signal?.aborted) {
        setLoading(false);
        setWaking(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  return { products, categories, loading, error, isStale, waking, reload: () => load() };
};

export default useProducts;
