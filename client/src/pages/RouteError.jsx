import { useRouteError } from 'react-router-dom';
import { RotateCw } from 'lucide-react';
import Button from '../components/common/Button';

export default function RouteError() {
  const error = useRouteError();
  if (import.meta.env.DEV) console.error(error);
  return (
    <div className="full-page-center not-found">
      <h1 className="page-title">Something went wrong</h1>
      <p className="muted">An unexpected error happened. Reloading usually fixes it.</p>
      <Button icon={RotateCw} onClick={() => window.location.reload()}>
        Reload page
      </Button>
    </div>
  );
}
