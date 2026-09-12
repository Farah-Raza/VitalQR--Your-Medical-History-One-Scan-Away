import { Button } from './ui.jsx';

/**
 * Renders a repeating group of fields (allergies, conditions, medications,
 * contacts) with add and remove controls.
 *
 * `renderRow` receives (item, update, index) where `update(field, value)`
 * patches just that row, so callers never manage array immutability
 * themselves.
 */
export default function RepeatableList({
  items,
  onChange,
  renderRow,
  newItem,
  addLabel = 'Add another',
  emptyLabel = 'Nothing added yet.',
  minItems = 0,
  errors = {},
  fieldPrefix = '',
}) {
  function update(index, field, value) {
    const next = items.map((item, i) => (i === index ? { ...item, [field]: value } : item));
    onChange(next);
  }

  function remove(index) {
    onChange(items.filter((_, i) => i !== index));
  }

  function add() {
    onChange([...items, typeof newItem === 'function' ? newItem() : { ...newItem }]);
  }

  // Errors arrive from zod flattened as "allergies.0.substance".
  const rowError = (index) =>
    Object.entries(errors).find(([key]) => key.startsWith(`${fieldPrefix}.${index}.`))?.[1];

  return (
    <div className="space-y-3">
      {items.length === 0 && (
        <p className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
          {emptyLabel}
        </p>
      )}

      {items.map((item, index) => (
        <div
          key={index}
          className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 sm:p-4"
        >
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              {renderRow(item, (field, value) => update(index, field, value), index)}
              {rowError(index) && (
                <p className="mt-2 text-xs font-medium text-red-600" role="alert">
                  {rowError(index)}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => remove(index)}
              disabled={items.length <= minItems}
              aria-label={`Remove item ${index + 1}`}
              title={
                items.length <= minItems
                  ? `At least ${minItems} required`
                  : `Remove item ${index + 1}`
              }
              className="mt-1 shrink-0 rounded-md p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                <path d="M9 3h6l1 2h4v2H4V5h4l1-2ZM6 9h12l-1 12H7L6 9Z" />
              </svg>
            </button>
          </div>
        </div>
      ))}

      <Button type="button" variant="secondary" size="sm" onClick={add}>
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
          <path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z" />
        </svg>
        {addLabel}
      </Button>
    </div>
  );
}
