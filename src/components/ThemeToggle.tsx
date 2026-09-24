import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

/** Light/dark toggle. Icon-only button with an accessible label. */
export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      className="grid h-control-sm w-control-sm place-items-center rounded-control border bg-surface text-muted transition duration-fast ease-out hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-surface"
    >
      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
