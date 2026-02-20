import { Outlet, Link, useLocation } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import styles from './Layout.module.css';

export function Layout() {
  const location = useLocation();
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('resu-theme') as 'light' | 'dark') || 'light';
    }
    return 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('resu-theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === 'light' ? 'dark' : 'light'));
  }, []);

  const isActive = (path: string) => (location.pathname === path ? 'active' : '');

  return (
    <div className={styles.layout}>
      <nav className={styles.navbar}>
        <Link to="/" className={styles['navbar-brand']}>
          <span>Resu</span>
        </Link>
        <div className={styles['navbar-links']}>
          <Link to="/" className={isActive('/')}>
            Dashboard
          </Link>
          <Link to="/generate" className={isActive('/generate')}>
            Generate
          </Link>
          <Link to="/profile" className={isActive('/profile')}>
            Profile
          </Link>
          <button className={styles['theme-toggle']} onClick={toggleTheme} title="Toggle theme">
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
      </nav>
      <main className={`${styles['main-content']} container`}>
        <Outlet />
      </main>
    </div>
  );
}
