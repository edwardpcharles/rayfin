import { useReducer, useCallback, useMemo, useRef } from 'react';
import type { DataTable } from '@microsoft/fabric-visuals-core';
import type { InteractionEvent } from '@microsoft/fabric-visuals-core';
import type {
    CrossFilterDefinition,
    CrossFilterState,
    FilterTableOptions,
    InteractionEventCallback,
} from './types';
import { createCrossFilterReducer } from './reducer';
import { parseInteractionEvents } from './event-parser';
import { applyCrossFilters, getFilterValues, isValueSelected } from './filter-engine';

/** The object returned by useCrossFilters. */
export interface CrossFilters {
    /**
     * Raw filter state keyed by filter id.
     * Read this only for custom UI rendering — prefer the helper methods below.
     */
    readonly state: CrossFilterState;

    /**
     * Returns a stable onInteraction callback for VegaVisual or DataGrid.
     * Any number of visuals can bind to the same filter id — they all update
     * shared state and therefore cross-filter each other.
     *
     * @example
     * <VegaVisual onInteraction={crossFilters.bindInteraction("weekday")} />
     * <DataGrid   onInteraction={crossFilters.bindInteraction("weekday")} />
     */
    bindInteraction(filterId: string): InteractionEventCallback;

    /**
     * Returns a new DataTable with active cross-filters applied.
     * Use options to include or exclude specific filter ids per consumer.
     *
     * @example
     * // Bar chart: status filter applies; excludes its own weekday selection
     * // so clicking one bar does not collapse the chart to a single bar.
     * const chartData = crossFilters.filterTable(base, { exclude: ["weekday"] });
     *
     * // Detail table: all active filters apply.
     * const tableData = crossFilters.filterTable(base);
     */
    filterTable(table: DataTable, options?: FilterTableOptions): DataTable;

    /**
     * Programmatically set a filter — use for dropdown controls, URL params, etc.
     * Pass an empty array to clear the filter.
     *
     * @example
     * crossFilters.setFilter("status", [e.target.value]);
     * crossFilters.setFilter("status", []); // clear
     */
    setFilter(id: string, values: unknown[]): void;

    /** Clear one active filter. No-op if already inactive. */
    clearFilter(id: string): void;

    /** Clear all active filters. */
    clearAll(): void;

    /**
     * True if a specific value is currently selected for a filter.
     * Use to style dropdown options, highlight chart marks, or indicate active rows.
     *
     * @example
     * className={crossFilters.isSelected("weekday", "Monday") ? "selected" : ""}
     */
    isSelected(id: string, value: unknown): boolean;

    /**
     * Returns the currently selected values for a filter.
     * Returns an empty array if the filter is inactive.
     *
     * @example
     * const [activeStatus] = crossFilters.getValues("status");
     */
    getValues(id: string): unknown[];
}

/**
 * Central React hook for cross-filter interaction between visuals.
 *
 * Centralises all interaction state so individual visuals only need to:
 * 1. Emit via `bindInteraction(filterId)`.
 * 2. Consume via `filterTable(table, options)`.
 *
 * @param definitions - Filter definitions. Keep this array stable across renders
 *                      by declaring it outside the component or wrapping in useMemo.
 *
 * @example
 * // Define once outside the component:
 * const FILTERS: CrossFilterDefinition[] = [
 *   { id: "status",  field: "status",       mode: "single", clears: ["weekday"] },
 *   { id: "weekday", field: "weekday_name", mode: "single" },
 * ];
 *
 * function MyPage() {
 *   const cf = useCrossFilters(FILTERS);
 *
 *   const chartData = cf.filterTable(base, { exclude: ["weekday"] });
 *   const tableData = cf.filterTable(base);
 *
 *   return (
 *     <>
 *       <VegaVisual data={chartData} onInteraction={cf.bindInteraction("weekday")} />
 *       <DataGrid   data={tableData} onInteraction={cf.bindInteraction("weekday")} />
 *       <button onClick={cf.clearAll}>Reset</button>
 *     </>
 *   );
 * }
 */
export function useCrossFilters(definitions: CrossFilterDefinition[]): CrossFilters {
    // Keep a live ref so callbacks can read the latest definitions without
    // being recreated on every render.
    const defsRef = useRef(definitions);
    defsRef.current = definitions;

    // Reducer created once from the initial definitions.
    const reducer = useMemo(
        () => createCrossFilterReducer(definitions),
        [] // eslint-disable-line react-hooks/exhaustive-deps
    );
    const [state, dispatch] = useReducer(reducer, {});

    // bindInteraction: stable reference; reads from defsRef at call time.
    const bindInteraction = useCallback(
        (filterId: string): InteractionEventCallback =>
            (events: InteractionEvent[]) => {
                const def = defsRef.current.find(d => d.id === filterId);
                if (!def) return;

                const parsed = parseInteractionEvents(events, def.field);

                if (parsed.intent === 'clear') {
                    dispatch({ type: 'clear', id: filterId });
                } else if (parsed.intent === 'select') {
                    if ((def.mode ?? 'single') === 'single') {
                        // Single mode: toggle the first extracted value
                        dispatch({ type: 'toggle', id: filterId, value: parsed.values[0] });
                    } else {
                        // Multi mode: toggle each value individually
                        for (const v of parsed.values) {
                            dispatch({ type: 'toggle', id: filterId, value: v });
                        }
                    }
                }
                // 'noop' intent: do nothing
            },
        [] // intentionally empty: reads from defsRef
    );

    const filterTable = useCallback(
        (table: DataTable, options?: FilterTableOptions) =>
            applyCrossFilters(table, state, options),
        [state]
    );

    const setFilter = useCallback(
        (id: string, values: unknown[]) => dispatch({ type: 'set', id, values }),
        []
    );

    const clearFilter = useCallback(
        (id: string) => dispatch({ type: 'clear', id }),
        []
    );

    const clearAll = useCallback(
        () => dispatch({ type: 'clearAll' }),
        []
    );

    const isSelected = useCallback(
        (id: string, value: unknown) => isValueSelected(state, id, value),
        [state]
    );

    const getValues = useCallback(
        (id: string) => getFilterValues(state, id),
        [state]
    );

    return {
        state,
        bindInteraction,
        filterTable,
        setFilter,
        clearFilter,
        clearAll,
        isSelected,
        getValues,
    };
}
