import type { InteractionEvent, SetPredicate } from '@microsoft/fabric-visuals-core';

/** Normalized result from parsing one round of visual interaction events. */
export type ParsedInteraction =
    | { intent: 'select'; field: string; values: unknown[] }
    | { intent: 'clear' }
    | { intent: 'noop' };

/**
 * Converts raw Fabric InteractionEvent[] into a normalized intent for one field.
 *
 * Both VegaVisual and DataGrid emit InteractionEvent[]. A bar click emits predicates
 * for *every* column in the clicked datum — e.g. weekday_name AND total_sales. This
 * function extracts only the predicate matching the configured field and ignores the rest.
 *
 * Safe behaviour guarantees:
 * - Never throws on missing or malformed event data.
 * - 'clear' events are handled explicitly and never fall through to 'noop'.
 * - Range predicates are intentionally ignored in v1 (returned as 'noop' unless
 *   the caller handles them separately).
 * - Multiple selections (OR) are flattened into a single values array.
 *
 * @param events - The array received from onInteraction.
 * @param field  - The ColumnDef.name to extract values for.
 */
export function parseInteractionEvents(
    events: InteractionEvent[],
    field: string
): ParsedInteraction {
    if (!events || events.length === 0) return { intent: 'noop' };

    // The last event is the authoritative intent when multiple events arrive
    const last = events[events.length - 1];

    if (last.action === 'clear') {
        return { intent: 'clear' };
    }

    if (last.action === 'select') {
        const values: unknown[] = [];

        for (const selection of last.selections) {
            for (const predicate of selection.predicates) {
                // Only handle set predicates matching the configured field
                if (predicate.type !== 'set') continue;
                if (predicate.name !== field) continue;

                const sp = predicate as SetPredicate;
                for (const v of sp.values) {
                    if (v != null) values.push(v);
                }
            }
        }

        if (values.length === 0) return { intent: 'noop' };
        return { intent: 'select', field, values };
    }

    return { intent: 'noop' };
}
