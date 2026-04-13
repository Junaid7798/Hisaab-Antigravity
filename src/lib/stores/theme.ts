import { writable } from 'svelte/store';

// Function to get initial theme from localStorage or system preference
function getInitialTheme(): 'light' | 'dark' | 'auto' {
	if (typeof window === 'undefined') return 'auto';
	
	const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'auto' | null;
	if (savedTheme) {
		return savedTheme;
	}
	return 'auto';
}

export const theme = writable<'light' | 'dark' | 'auto'>(getInitialTheme());

// Effect to apply theme to HTML element
if (typeof window !== 'undefined') {
	theme.subscribe((value) => {
		localStorage.setItem('theme', value);
		
		let isDark = value === 'dark';
		
		if (value === 'auto') {
			isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
		}

		if (isDark) {
			document.documentElement.classList.add('dark');
		} else {
			document.documentElement.classList.remove('dark');
		}
	});

	// Listen for system theme changes if set to auto
	window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
		let currentTheme;
		theme.subscribe(t => currentTheme = t)(); // Get current value synchronously
		if (currentTheme === 'auto') {
			if (e.matches) {
				document.documentElement.classList.add('dark');
			} else {
				document.documentElement.classList.remove('dark');
			}
		}
	});
}
