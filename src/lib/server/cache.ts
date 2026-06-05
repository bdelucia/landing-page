type CacheEntry<T> = {
	expiresAt: number;
	staleUntil: number;
	value: T;
};

const store = new Map<string, CacheEntry<unknown>>();
const inFlight = new Map<string, Promise<unknown>>();

type CacheOptions = {
	allowStale?: boolean;
	staleTtlMs?: number;
};

export async function withCache<T>(
	key: string,
	ttlMs: number,
	fetcher: () => Promise<T>,
	options: CacheOptions = {}
): Promise<T> {
	const now = Date.now();
	const cached = store.get(key);
	if (cached && cached.expiresAt > now) {
		return cached.value as T;
	}

	if (cached && options.allowStale && cached.staleUntil > now) {
		if (!inFlight.has(key)) {
			const refreshPromise = fetchAndStore(key, ttlMs, fetcher, options.staleTtlMs).finally(() => {
				inFlight.delete(key);
			});
			inFlight.set(key, refreshPromise);
		}
		return cached.value as T;
	}

	const activeRequest = inFlight.get(key);
	if (activeRequest) {
		return (await activeRequest) as T;
	}

	const fetchPromise = fetchAndStore(key, ttlMs, fetcher, options.staleTtlMs).finally(() => {
		inFlight.delete(key);
	});
	inFlight.set(key, fetchPromise);
	return (await fetchPromise) as T;
}

async function fetchAndStore<T>(
	key: string,
	ttlMs: number,
	fetcher: () => Promise<T>,
	staleTtlMs = 0
): Promise<T> {
	const value = await fetcher();
	const fetchedAt = Date.now();
	store.set(key, {
		value,
		expiresAt: fetchedAt + ttlMs,
		staleUntil: fetchedAt + ttlMs + staleTtlMs
	});
	return value;
}
