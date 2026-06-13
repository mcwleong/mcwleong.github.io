const STORAGE_KEY = 'imagepad-theme';

export function getPreferredTheme() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
}

export function initTheme() {
    applyTheme(getPreferredTheme());

    const toggle = document.getElementById('theme-toggle');
    if (!toggle) return;

    const updateToggleLabel = () => {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        toggle.textContent = isDark ? '☀️' : '🌙';
        toggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
        toggle.title = isDark ? 'Light mode' : 'Dark mode';
    };

    updateToggleLabel();

    toggle.addEventListener('click', () => {
        const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        localStorage.setItem(STORAGE_KEY, next);
        applyTheme(next);
        updateToggleLabel();
    });
}
