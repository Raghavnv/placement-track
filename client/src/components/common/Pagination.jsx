import { ChevronLeft, ChevronRight } from 'lucide-react';
import Button from './Button';

export default function Pagination({ page, totalPages, total, onChange, itemLabel = 'results' }) {
  if (!totalPages || totalPages <= 1) return null;
  return (
    <nav className="pagination" aria-label="Pagination">
      <Button variant="secondary" size="sm" icon={ChevronLeft} disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Previous
      </Button>
      <span className="pagination__status">
        Page {page} of {totalPages}
        {total !== undefined && <span className="pagination__total"> · {total} {itemLabel}</span>}
      </span>
      <Button variant="secondary" size="sm" iconRight={ChevronRight} disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        Next
      </Button>
    </nav>
  );
}
