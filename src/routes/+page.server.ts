import {
	loadDashboardFinances,
	loadDashboardNews,
	loadDashboardWeather
} from '$lib/server/dashboard/dashboard-data';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({
	weather: loadDashboardWeather(),
	finances: loadDashboardFinances(),
	news: loadDashboardNews()
});
