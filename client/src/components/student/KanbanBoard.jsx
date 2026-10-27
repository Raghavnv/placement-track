import { KANBAN_COLUMNS } from '../../utils/stages';
import ApplicationCard from './ApplicationCard';

export default function KanbanBoard({ applications, onOpen }) {
  return (
    <div className="kanban" role="list" aria-label="Applications by stage">
      {KANBAN_COLUMNS.map((column) => {
        const items = applications.filter((a) => column.stages.includes(a.stage));
        return (
          <section key={column.key} className={`kanban__col kanban__col--${column.key}`} role="listitem" aria-label={`${column.label}: ${items.length}`}>
            <header className="kanban__col-head">
              <span className="kanban__col-dot" aria-hidden="true" />
              <h2>{column.label}</h2>
              <span className="kanban__count">{items.length}</span>
            </header>
            <div className="kanban__list">
              {items.length ? (
                items.map((application) => <ApplicationCard key={application._id} application={application} onOpen={onOpen} />)
              ) : (
                <p className="kanban__empty">Nothing here yet</p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
