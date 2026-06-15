import type { CrossFilterState, CrossFilterAction, CrossFilterDefinition } from './types';

/**
 * Returns a pure reducer function pre-configured with your filter definitions.
 * Pass the return value directly to React's useReducer.
 *
 * The reducer is created once from the initial definitions array and stored in a
 * useMemo in the hook, so it stays stable across renders.
 *
 * Semantics:
 * - 'set'      — replace values for a filter; empty array clears it.
 *               Dependency filters listed in `clears` are reset.
 * - 'toggle'   — single mode: same value deselects, different value replaces.
 *               multi mode: each value is toggled in/out of the active set.
 *               Dependency filters listed in `clears` are reset.
 * - 'clear'    — removes one filter entry.
 * - 'clearAll' — removes all filter entries.
 *
 * @param definitions - Filter definitions. Must be the same array used in useCrossFilters.
 */
export function createCrossFilterReducer(
    definitions: CrossFilterDefinition[]
): (state: CrossFilterState, action: CrossFilterAction) => CrossFilterState {
    const defMap = new Map<string, CrossFilterDefinition>(
        definitions.map(d => [d.id, d])
    );

    return function crossFilterReducer(
        state: CrossFilterState,
        action: CrossFilterAction
    ): CrossFilterState {
        switch (action.type) {

            case 'set': {
                const def = defMap.get(action.id);
                if (!def) return state;

                const next: CrossFilterState = { ...state };

                // Reset declared dependencies
                for (const depId of def.clears ?? []) next[depId] = undefined;

                next[action.id] = action.values.length > 0
                    ? { field: def.field, values: action.values }
                    : undefined;

                return next;
            }

            case 'toggle': {
                const def = defMap.get(action.id);
                if (!def) return state;

                const mode = def.mode ?? 'single';
                const current = state[action.id];
                const next: CrossFilterState = { ...state };

                // Reset declared dependencies
                for (const depId of def.clears ?? []) next[depId] = undefined;

                if (mode === 'single') {
                    // Same value → deselect. Different value → replace.
                    const isSame =
                        current?.values.length === 1 &&
                        current.values[0] === action.value;

                    next[action.id] = isSame
                        ? undefined
                        : { field: def.field, values: [action.value] };
                } else {
                    // Multi: add if absent, remove if present
                    const existing = current?.values ?? [];
                    const updated = existing.some(v => v === action.value)
                        ? existing.filter(v => v !== action.value)
                        : [...existing, action.value];

                    next[action.id] = updated.length > 0
                        ? { field: def.field, values: updated }
                        : undefined;
                }

                return next;
            }

            case 'clear': {
                if (state[action.id] === undefined) return state; // nothing to do
                return { ...state, [action.id]: undefined };
            }

            case 'clearAll': {
                if (Object.values(state).every(v => v === undefined)) return state;
                return {};
            }

            default:
                return state;
        }
    };
}
