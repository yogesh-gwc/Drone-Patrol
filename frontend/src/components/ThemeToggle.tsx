import { useThemeStore } from '../store/themeStore'

/** Light / dark switch. Light is the default appearance. */
export function ThemeToggle() {
  const theme = useThemeStore((state) => state.theme)
  const toggleTheme = useThemeStore((state) => state.toggleTheme)

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
      className="rounded-sm border border-slate-300 px-2.5 py-1 text-[10px] font-medium tracking-[0.18em] text-slate-600 uppercase transition-colors hover:border-slate-400 hover:text-slate-900 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-500 dark:hover:text-slate-100"
    >
      {theme === 'dark' ? 'Dark' : 'Light'}
    </button>
  )
}
