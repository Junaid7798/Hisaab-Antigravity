import { addMessages, init, getLocaleFromNavigator } from 'svelte-i18n';

import en from './locales/en.json';
import hi from './locales/hi.json';
import mr from './locales/mr.json';

addMessages('en', en);
addMessages('hi', hi);
addMessages('mr', mr);

export function setupI18n() {
	let initialLocale = 'en';
	if (typeof window !== 'undefined') {
		const savedLocale = localStorage.getItem('locale');
		if (savedLocale) {
			initialLocale = savedLocale;
		} else {
			initialLocale = getLocaleFromNavigator() || 'en';
			// Fallback mapped to generic top-level languages
			if (initialLocale.startsWith('hi')) initialLocale = 'hi';
			else if (initialLocale.startsWith('mr')) initialLocale = 'mr';
			else initialLocale = 'en';
		}
	}

	init({
		fallbackLocale: 'en',
		initialLocale
	});
}
