import type { InteractionEvent } from '@microsoft/fabric-visuals-core';

/**
 * How many values can be selected at once for a filter dimension.
 * - "single": clicking same value deselects it; clicking a different value replaces it.
 * - "multi":  each click adds or removes one value from the active set.
 */
export type CrossFilterMode = 'single' | 'multi';

/**
 * Declares one filter dimension.
 * Create one entry per field that any visual can select from.
 */
export interface CrossFilterDefinition {
    /** Stable identifier for this filter, e.g. "weekday" or "status". */
    id: string;
    /** The DataTable column name (ColumnDef.name) this filter targets. */
    field: string;
    /** Defaults to "single". */
    mode?: CrossFilterMode;
    /**
     * Other filter ids to reset whenever this filter changes.
     * @example { id: "status", clears: ["weekday"] }
     */
    clears?: string[];
}

/** Internal state for one active filter dimension. */
export interface CrossFilterEntry {
    field: string;
    values: unknown[];
}

/**
 * Keys are filter ids. An undefined entry means that filter is inactive.
 * This is intentionally generic — field names come from definitions, not from
 * hard-coded state properties.
 */
export type CrossFilterState = Record<string, CrossFilterEntry | undefined>;

/** All actions the reducer understands. */
export type CrossFilterAction =
    | { type: 'set';      id: string; values: unknown[] }
    | { type: 'toggle';   id: string; value: unknown }
    | { type: 'clear';    id: string }
    | { type: 'clearAll' };

/**
 * Options for filterTable(). Controls which filter ids are applied to a specific
 * data view, so a visual can be filtered by others but not by its own emitted field.
 */
export interface FilterTableOptions {
    /** Only apply these filter ids; ignore all others. */
    include?: string[];
    /** Skip these filter ids; apply all others. */
    exclude?: string[];
}

/** Re-export for convenience — matches the onInteraction prop on VegaVisual and DataGrid. */
export type InteractionEventCallback = (events: InteractionEvent[]) => void;
