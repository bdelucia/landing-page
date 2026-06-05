import { loadDashboardFinances, loadDashboardWeather } from '$lib/server/dashboard-data';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({
	weather: loadDashboardWeather(),
	finances: loadDashboardFinances()
});
