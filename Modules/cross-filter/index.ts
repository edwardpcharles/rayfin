// Types
export type {
    CrossFilterDefinition,
    CrossFilterMode,
    CrossFilterState,
    CrossFilterAction,
    CrossFilterEntry,
    FilterTableOptions,
    InteractionEventCallback,
} from './types';

// Event parser
export { parseInteractionEvents } from './event-parser';
export type { ParsedInteraction } from './event-parser';

// Reducer factory (for advanced usage — most callers just need useCrossFilters)
export { createCrossFilterReducer } from './reducer';

// Filter engine (for advanced usage — most callers just need useCrossFilters)
export { applyCrossFilters, getFilterValues, isValueSelected } from './filter-engine';

// Main React hook
export { useCrossFilters } from './use-cross-filters';
export type { CrossFilters } from './use-cross-filters';
