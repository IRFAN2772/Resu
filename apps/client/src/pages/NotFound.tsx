import { Link } from 'react-router-dom';
import styles from './NotFound.module.css';

export function NotFoundPage() {
  return (
    <div className={styles.container}>
      <div className={styles.code}>404</div>
      <h1>Page Not Found</h1>
      <p>The page you're looking for doesn't exist or has been moved.</p>
      <Link to="/" className="btn btn-primary">
        Back to Dashboard
      </Link>
    </div>
  );
}
