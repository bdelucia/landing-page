<script lang="ts">
	import {
		NEWS_CATEGORIES,
		NEWS_CATEGORY_META,
		type DashboardNews,
		type NewsArticleItem,
		type NewsCategory
	} from '$lib/hooks/news/news';
	import NewsRowsSkeleton from '$lib/components/news/NewsRowsSkeleton.svelte';

	export type NewsTab = 'all' | NewsCategory;

	let {
		news,
		class: className = ''
	}: {
		news: Promise<DashboardNews>;
		class?: string;
	} = $props();

	const MAX_ROWS = 40;
	const MAX_UPCOMING_RELEASES = 12;

	const TABS: Array<{ id: NewsTab; label: string }> = [
		{ id: 'all', label: 'All' },
		...NEWS_CATEGORIES.map((category) => ({
			id: category as NewsTab,
			label: NEWS_CATEGORY_META[category].tabLabel
		}))
	];

	let activeTab = $state<NewsTab>('all');

	function upcomingReleases(articles: NewsArticleItem[]): NewsArticleItem[] {
		return articles
			.filter((article) => article.category === 'gaming' && article.isUpcoming)
			.sort((a, b) => a.sortDate.localeCompare(b.sortDate))
			.slice(0, MAX_UPCOMING_RELEASES);
	}

	function rowsForTab(articles: NewsArticleItem[], tab: NewsTab): NewsArticleItem[] {
		const pool =
			tab === 'all'
				? articles.filter((article) => !article.isUpcoming)
				: articles.filter((article) => article.category === tab && !article.isUpcoming);

		return [...pool].sort((a, b) => b.sortDate.localeCompare(a.sortDate)).slice(0, MAX_ROWS);
	}

	function rowsHeading(tab: NewsTab): string {
		if (tab === 'gaming') return 'Recently released';
		if (tab === 'ai') return 'AI stories';
		if (tab === 'local') return 'Arizona headlines';
		return 'Latest stories';
	}

	const EMPTY_MESSAGES: Record<NewsTab, string> = {
		all: 'No stories yet. Add news API keys in secrets.local.ts, then run "pnpm sync-news" or wait for the cron job.',
		ai: 'No AI stories yet. They sync from Hacker News — run "pnpm sync-news" or wait for the cron job.',
		gaming:
			'No game releases yet. Add a RAWG API key in secrets.local.ts, then run "pnpm sync-news".',
		local:
			'No Arizona headlines yet. Add a NewsAPI key in secrets.local.ts, then run "pnpm sync-news".'
	};

	function emptyMessage(tab: NewsTab, errors: DashboardNews['errors']): string {
		if (tab !== 'all' && errors[tab]) return errors[tab] as string;

		const firstError = Object.values(errors)[0];
		if (tab === 'all' && firstError) return firstError;

		return EMPTY_MESSAGES[tab];
	}

	function metaParts(article: NewsArticleItem): string[] {
		const parts: string[] = [];
		if (article.source) parts.push(article.source);
		if (article.category === 'gaming' && article.platforms.length > 0) {
			parts.push(article.platforms.slice(0, 3).join(', '));
		} else if (article.summary) {
			parts.push(article.summary);
		}
		return parts;
	}
</script>

{#await news}
	<section class="news-panel {className}" aria-busy="true">
		<div class="news-panel__tabs" aria-hidden="true">
			{#each TABS as tab (tab.id)}
				<span class="news-panel__tab">{tab.label}</span>
			{/each}
		</div>
		<div class="news-panel__list-container">
			<NewsRowsSkeleton rowCount={6} />
			<p class="sr-only" role="status">Loading news</p>
		</div>
	</section>
{:then dashboardNews}
	{@const releases = upcomingReleases(dashboardNews.articles)}
	{@const showReleaseRail = (activeTab === 'gaming' || activeTab === 'all') && releases.length > 0}
	{@const rows = rowsForTab(dashboardNews.articles, activeTab)}

	<section class="news-panel {className}" aria-busy="false">
		<div class="news-panel__tabs" role="tablist" aria-label="News categories">
			{#each TABS as tab (tab.id)}
				<button
					type="button"
					role="tab"
					class="news-panel__tab"
					class:news-panel__tab--active={activeTab === tab.id}
					aria-selected={activeTab === tab.id}
					onclick={() => (activeTab = tab.id)}
				>
					{tab.label}
				</button>
			{/each}
		</div>

		{#key activeTab}
			<div class="news-panel__content">
				{#if showReleaseRail}
					<div class="news-panel__releases">
						<h2 class="news-panel__section-heading">Releasing soon</h2>
						<ul class="news-panel__release-rail">
							{#each releases as release, index (release.id)}
								<li class="news-panel__release-item" style="--card-index: {index}">
									<a
										class="news-panel__release-card"
										href={release.url}
										target="_blank"
										rel="noopener noreferrer"
									>
										<span class="news-panel__release-cover">
											{#if release.imageUrl}
												<img src={release.imageUrl} alt="" loading="lazy" />
											{:else}
												<span class="news-panel__release-cover-fallback" aria-hidden="true">
													{release.title.slice(0, 1)}
												</span>
											{/if}
											<span class="news-panel__release-chip">{release.dateLabel}</span>
										</span>
										<span class="news-panel__release-name">{release.title}</span>
									</a>
								</li>
							{/each}
						</ul>
					</div>
				{/if}

				<div class="news-panel__rows">
					<h2 class="news-panel__section-heading">{rowsHeading(activeTab)}</h2>

					<div class="news-panel__list-container">
						{#if rows.length === 0}
							<p class="news-panel__message" role="status">
								{emptyMessage(activeTab, dashboardNews.errors)}
							</p>
						{:else}
							<ul class="news-panel__list">
								{#each rows as article, index (article.id)}
									<li class="news-panel__row" style="--row-index: {index}">
										<a
											class="news-panel__row-link"
											href={article.url}
											target="_blank"
											rel="noopener noreferrer"
										>
											{#if article.category === 'gaming' && article.imageUrl}
												<img
													class="news-panel__row-thumb"
													src={article.imageUrl}
													alt=""
													loading="lazy"
												/>
											{/if}
											<span class="news-panel__row-main">
												<span class="news-panel__row-title">{article.title}</span>
												<span class="news-panel__row-meta">
													<span
														class="news-panel__row-category"
														style:color={NEWS_CATEGORY_META[article.category].accentVar}
													>
														{NEWS_CATEGORY_META[article.category].label}
													</span>
													{#each metaParts(article) as part (part)}
														<span aria-hidden="true">·</span>
														<span class="news-panel__row-meta-part">{part}</span>
													{/each}
												</span>
											</span>
											<span class="news-panel__row-date">{article.dateLabel}</span>
										</a>
									</li>
								{/each}
							</ul>
						{/if}
					</div>
				</div>
			</div>
		{/key}
	</section>
{:catch loadError}
	<section class="news-panel {className}" aria-busy="false">
		<p class="news-panel__message" role="status">
			{loadError instanceof Error ? loadError.message : 'Failed to load news'}
		</p>
	</section>
{/await}

<style>
	.news-panel {
		display: flex;
		flex: 1;
		flex-direction: column;
		gap: 1.25rem;
		width: 100%;
		min-height: 0;
		overflow: hidden;
	}

	.news-panel__tabs {
		display: flex;
		flex-shrink: 0;
		flex-wrap: wrap;
		gap: 0.375rem;
	}

	.news-panel__tab {
		display: inline-flex;
		align-items: center;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-full);
		background: transparent;
		padding: 0.3125rem 0.875rem;
		font: inherit;
		font-size: 0.8125rem;
		line-height: 1.25;
		color: var(--color-muted-foreground);
		cursor: pointer;
		transition:
			color 0.15s ease,
			border-color 0.15s ease,
			background-color 0.15s ease;
	}

	.news-panel__tab:hover {
		border-color: var(--color-secondary);
		color: var(--color-primary);
	}

	.news-panel__tab:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}

	.news-panel__tab--active {
		border-color: var(--color-secondary);
		background: var(--color-secondary);
		color: var(--color-background);
		font-weight: 500;
	}

	.news-panel__tab--active:hover {
		color: var(--color-background);
	}

	.news-panel__content {
		display: flex;
		flex: 1;
		flex-direction: column;
		gap: 1.25rem;
		min-height: 0;
		overflow: hidden;
		animation: news-content-enter 420ms cubic-bezier(0.22, 1, 0.36, 1) both;
	}

	@keyframes news-content-enter {
		from {
			opacity: 0;
			transform: translateY(0.625rem);
		}

		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.news-panel__section-heading {
		margin: 0;
		font-size: 0.6875rem;
		font-weight: 500;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-muted-foreground);
	}

	.news-panel__releases {
		display: flex;
		flex-shrink: 0;
		flex-direction: column;
		gap: 0.75rem;
	}

	.news-panel__release-rail {
		display: flex;
		gap: 0.875rem;
		margin: 0;
		padding: 0.125rem 0.125rem 0.625rem;
		list-style: none;
		overflow-x: auto;
		scrollbar-width: thin;
		scrollbar-color: var(--color-secondary) transparent;
	}

	.news-panel__release-rail::-webkit-scrollbar {
		height: 4px;
	}

	.news-panel__release-rail::-webkit-scrollbar-track {
		background: transparent;
	}

	.news-panel__release-rail::-webkit-scrollbar-thumb {
		border-radius: var(--radius-full);
		background-color: var(--color-secondary);
	}

	.news-panel__release-item {
		flex-shrink: 0;
		width: 7.25rem;
		animation: news-card-enter 420ms cubic-bezier(0.22, 1, 0.36, 1) both;
		animation-delay: calc(var(--card-index, 0) * 45ms);
	}

	@keyframes news-card-enter {
		from {
			opacity: 0;
			transform: translateY(0.75rem) scale(0.96);
		}

		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	.news-panel__release-card {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		text-decoration: none;
		color: var(--color-primary);
	}

	.news-panel__release-card:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
		border-radius: var(--radius-md);
	}

	.news-panel__release-cover {
		position: relative;
		display: block;
		aspect-ratio: 3 / 4;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		overflow: hidden;
		background: var(--color-surface);
		transition:
			transform 0.18s ease,
			border-color 0.18s ease,
			box-shadow 0.18s ease;
	}

	.news-panel__release-card:hover .news-panel__release-cover {
		transform: translateY(-3px);
		border-color: var(--color-secondary);
		box-shadow: 0 6px 18px color-mix(in srgb, var(--color-secondary) 18%, transparent);
	}

	.news-panel__release-cover img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.news-panel__release-cover-fallback {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
		font-size: 2rem;
		font-weight: 500;
		color: var(--color-muted-foreground);
	}

	.news-panel__release-chip {
		position: absolute;
		inset-inline-start: 0.375rem;
		inset-block-end: 0.375rem;
		border-radius: var(--radius-full);
		background: color-mix(in srgb, var(--color-background) 82%, black);
		padding: 0.1875rem 0.5rem;
		font-size: 0.6875rem;
		font-weight: 500;
		line-height: 1.2;
		color: var(--color-secondary);
		white-space: nowrap;
	}

	.news-panel__release-name {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		font-size: 0.8125rem;
		font-weight: 500;
		line-height: 1.3;
	}

	.news-panel__rows {
		display: flex;
		flex: 1;
		flex-direction: column;
		gap: 0.75rem;
		min-height: 0;
		overflow: hidden;
	}

	.news-panel__list-container {
		flex: 1;
		min-height: 0;
		overflow-x: hidden;
		overflow-y: auto;
		scrollbar-gutter: stable;
		padding-inline-end: 0.75rem;
		scrollbar-width: thin;
		scrollbar-color: var(--color-secondary) transparent;
	}

	.news-panel__list-container::-webkit-scrollbar {
		width: 4px;
	}

	.news-panel__list-container::-webkit-scrollbar-track {
		margin-block: 0.125rem;
		background: transparent;
	}

	.news-panel__list-container::-webkit-scrollbar-thumb {
		border-radius: var(--radius-full);
		background-color: var(--color-secondary);
	}

	.news-panel__message {
		margin: 0;
		font-size: 0.875rem;
		color: var(--color-muted-foreground);
	}

	.news-panel__list {
		display: flex;
		flex-direction: column;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.news-panel__row {
		border-top: 1px solid var(--color-border);
		animation: news-row-enter 380ms cubic-bezier(0.22, 1, 0.36, 1) both;
		animation-delay: calc(min(var(--row-index, 0), 10) * 35ms);
	}

	@keyframes news-row-enter {
		from {
			opacity: 0;
			transform: translateY(0.5rem);
		}

		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.news-panel__row:first-child {
		border-top: 0;
	}

	.news-panel__row-link {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.875rem 0;
		text-decoration: none;
		color: inherit;
	}

	.news-panel__row:first-child .news-panel__row-link {
		padding-top: 0;
	}

	.news-panel__row-link:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
		border-radius: var(--radius-sm);
	}

	.news-panel__row-thumb {
		flex-shrink: 0;
		width: 2.5rem;
		height: 3.25rem;
		border-radius: var(--radius-sm);
		object-fit: cover;
		border: 1px solid var(--color-border);
	}

	.news-panel__row-main {
		display: flex;
		flex: 1;
		flex-direction: column;
		gap: 0.25rem;
		min-width: 0;
	}

	.news-panel__row-title {
		font-size: 0.9375rem;
		font-weight: 500;
		line-height: 1.35;
		color: var(--color-primary);
		transition: color 0.15s ease;
	}

	.news-panel__row-link:hover .news-panel__row-title {
		color: var(--color-secondary);
	}

	.news-panel__row-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 0.375rem;
		font-size: 0.8125rem;
		color: var(--color-muted-foreground);
	}

	.news-panel__row-category {
		font-weight: 500;
	}

	.news-panel__row-meta-part {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		max-width: 28rem;
	}

	.news-panel__row-date {
		flex-shrink: 0;
		padding-top: 0.125rem;
		font-size: 0.75rem;
		color: var(--color-muted-foreground);
		white-space: nowrap;
	}

	@media (prefers-reduced-motion: reduce) {
		.news-panel__content,
		.news-panel__release-item,
		.news-panel__row {
			animation: none;
		}

		.news-panel__release-cover {
			transition: none;
		}
	}
</style>
