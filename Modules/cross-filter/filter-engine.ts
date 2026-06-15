import type { DataTable } from '@microsoft/fabric-visuals-core';
import type { CrossFilterState, FilterTableOptions } from './types';

/**
 * Applies active cross-filters to a DataTable and returns a new DataTable.
 * The source table is never mutated.
 *
 * Filter logic:
 * - AND across different filter ids — all active filters must match.
 * - OR within one filter's values — any matching value passes the row.
 * - Missing column in this table — that filter is skipped (pass-through).
 *
 * Scope control via options:
 * - No options             → apply all active filters.
 * - { include: ["status"] }  → apply only the status filter.
 * - { exclude: ["weekday"] } → apply everything except the weekday filter.
 *   Use this for controller visuals so they are not filtered by their own selection.
 *
 * @param table   - Source DataTable (typically from toDataTable()).
 * @param state   - Current state from useCrossFilters.
 * @param options - Optional include/exclude to scope which filters apply.
 */
export function applyCrossFilters(
    table: DataTable,
    state: CrossFilterState,
    options?: FilterTableOptions
): DataTable {
    // Collect filter ids that are active and pass scope options
    const activeIds = Object.keys(state).filter(id => {
        const entry = state[id];
        if (!entry || entry.values.length === 0) return false;
        if (options?.include !== undefined && !options.include.includes(id)) return false;
        if (options?.exclude !== undefined && options.exclude.includes(id)) return false;
        return true;
    });

    if (activeIds.length === 0) return table;

    // Pre-compute column indexes once; -1 means column absent in this table
    const colIdx = new Map<string, number>();
    for (const id of activeIds) {
        colIdx.set(
            id,
            table.columns.findIndex(col => col.name === state[id]!.field)
        );
    }

    const filteredRows = table.rows.filter(row =>
        activeIds.every(id => {
            const idx = colIdx.get(id)!;
            if (idx === -1) return true; // column absent → pass row through
            const rowVal = row[idx];
            return state[id]!.values.some(v => v === rowVal);
        })
    );

    return { columns: table.columns, rows: filteredRows };
}

/**
 * Returns selected values for a filter id.
 * Returns an empty array if the filter is inactive.
 */
export function getFilterValues(state: CrossFilterState, id: string): unknown[] {
    return state[id]?.values ?? [];
}

/**
 * Returns true if a specific value is currently selected for a filter id.
 * Useful for styling dropdown options, selected rows, or highlighted chart marks.
 */
export function isValueSelected(
    state: CrossFilterState,
    id: string,
    value: unknown
): boolean {
    return (state[id]?.values ?? []).some(v => v === value);
}
