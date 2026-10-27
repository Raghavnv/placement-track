import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import Button from '../components/common/Button';
import Logo from '../components/common/Logo';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { useAuth } from '../context/AuthContext';
import { homePathFor } from '../utils/constants';

export default function NotFoundPage() {
  useDocumentTitle('Page not found');
  const { user } = useAuth();
  return (
    <div className="full-page-center not-found">
      <Logo />
      <p className="not-found__code" aria-hidden="true">404</p>
      <h1 className="page-title">This page took a different track</h1>
      <p className="muted">The link may be broken or the page may have moved.</p>
      <Button as={Link} to={user ? homePathFor(user) : '/login'} icon={Compass}>
        {user ? 'Back to dashboard' : 'Go to login'}
      </Button>
    </div>
  );
}
