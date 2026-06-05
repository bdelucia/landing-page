type CacheEntry<T> = {
	expiresAt: number;
	value: T;
};

const store = new Map<string, CacheEntry<unknown>>();

export async function withCache<T>(
	key: string,
	ttlMs: number,
	fetcher: () => Promise<T>
): Promise<T> {
	const now = Date.now();
	const cached = store.get(key);
	if (cached && cached.expiresAt > now) {
		return cached.value as T;
	}

	const value = await fetcher();
	store.set(key, { expiresAt: now + ttlMs, value });
	return value;
}
