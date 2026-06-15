# Cross-Filter Module — Usage Guide

## What it solves

Before this module, adding cross-filtering between any two visuals required:
- A new piece of state for each field.
- A new reducer action for each field.
- A new selector for each data view.
- Repeated `onInteraction` handlers in every component.

This module replaces all of that with three concepts:
1. **Definitions** — declare which fields are filterable, once.
2. **`bindInteraction`** — connect any visual emitter to a filter id.
3. **`filterTable`** — derive filtered data for any data consumer.

---

## Core API

### `CrossFilterDefinition`

```ts
interface CrossFilterDefinition {
  id: string;                   // stable filter key, e.g. "weekday" or "status"
  field: string;                // DataTable column name (ColumnDef.name)
  mode?: "single" | "multi";   // defaults to "single"
  clears?: string[];            // other filter ids to reset when this one changes
}
```

### `useCrossFilters(definitions)`

```ts
const crossFilters = useCrossFilters([
  { id: "status",  field: "status",       mode: "single", clears: ["weekday"] },
  { id: "weekday", field: "weekday_name", mode: "single" },
]);
```

Returns an object with:

| Method | Purpose |
|---|---|
| `bindInteraction(filterId)` | Returns a stable `onInteraction` callback for `VegaVisual` / `DataGrid` |
| `filterTable(table, options?)` | Returns a filtered `DataTable` |
| `setFilter(id, values)` | Programmatically set filter (for dropdowns, URL params, etc.) |
| `clearFilter(id)` | Clear one filter |
| `clearAll()` | Clear all filters |
| `isSelected(id, value)` | Check if a value is active (for styling) |
| `getValues(id)` | Get currently active values array |
| `state` | Raw state object (for custom UI) |

---

## Quickstart

### Minimal bar chart + detail table

```tsx
import { useCrossFilters } from "@/interaction/cross-filter";
import type { CrossFilterDefinition } from "@/interaction/cross-filter";

const FILTERS: CrossFilterDefinition[] = [
  { id: "status",   field: "status",        mode: "single", clears: ["category"] },
  { id: "category", field: "category_name", mode: "single" },
];

function Dashboard() {
  const cf = useCrossFilters(FILTERS);

  // Chart: filtered by status only — weekday selection does NOT collapse the chart
  const chartData = cf.filterTable(base, { exclude: ["category"] });

  // Table: filtered by everything
  const tableData = cf.filterTable(base);

  return (
    <>
      <VegaVisual
        spec={barSpec}
        data={chartData}
        theme={theme}
        onInteraction={cf.bindInteraction("category")}
      />
      <DataGrid
        data={tableData}
        theme={theme}
        onInteraction={cf.bindInteraction("category")}
      />
      <button onClick={cf.clearAll}>Reset</button>
    </>
  );
}
```

### Dropdown driving a filter

```tsx
<select
  value={String(cf.getValues("status")[0] ?? "")}
  onChange={e =>
    cf.setFilter("status", e.target.value ? [e.target.value] : [])
  }
>
  <option value="">All</option>
  {options.map(s => <option key={s} value={s}>{s}</option>)}
</select>
```

### Two charts that cross-filter each other

```tsx
const FILTERS: CrossFilterDefinition[] = [
  { id: "region",  field: "region",  mode: "single" },
  { id: "product", field: "product", mode: "single" },
];

function Page() {
  const cf = useCrossFilters(FILTERS);

  const regionData  = cf.filterTable(base, { exclude: ["region"] });
  const productData = cf.filterTable(base, { exclude: ["product"] });
  const tableData   = cf.filterTable(base);

  return (
    <>
      <VegaVisual data={regionData}  onInteraction={cf.bindInteraction("region")}  />
      <VegaVisual data={productData} onInteraction={cf.bindInteraction("product")} />
      <DataGrid   data={tableData} />
    </>
  );
}
```

---

## `filterTable` options

| Call | Behaviour |
|---|---|
| `filterTable(base)` | Apply all active filters (use for detail table) |
| `filterTable(base, { exclude: ["weekday"] })` | Apply all except weekday (use for a chart that emits weekday) |
| `filterTable(base, { include: ["status"] })` | Apply only status (use for KPI cards that only care about status) |

---

## Filter semantics

### Single mode (default)
- Select a value → sets filter to that value.
- Select the **same** value again → clears filter (toggle off).
- Select a **different** value → replaces filter.

### Multi mode
- Each click toggles one value in/out of the active set.
- `clear` event removes all values.

### Dependencies (`clears`)
```ts
{ id: "status", field: "status", clears: ["weekday"] }
```
Whenever `status` changes, `weekday` is automatically cleared. Declare these in your definitions rather than handling them in component code.

---

## Important: stable definitions

Define the definitions array **outside** the component, or in `useMemo`:

```ts
// ✅ Defined outside the component — stable reference
const FILTERS: CrossFilterDefinition[] = [
  { id: "weekday", field: "weekday_name", mode: "single" }
];

function MyPage() {
  const cf = useCrossFilters(FILTERS);
}
```

```ts
// ⚠️ Defined inside — creates a new array every render
function MyPage() {
  const cf = useCrossFilters([{ id: "weekday", ... }]);
}
```

---

## Advanced: using the primitives directly

For custom React state management or non-React environments, the underlying primitives are also exported:

```ts
import {
  createCrossFilterReducer,
  applyCrossFilters,
  parseInteractionEvents,
  getFilterValues,
  isValueSelected,
} from "@/interaction/cross-filter";
```

### `parseInteractionEvents(events, field)`

```ts
const result = parseInteractionEvents(events, "weekday_name");
// result: { intent: "select", field: "weekday_name", values: ["Monday"] }
// result: { intent: "clear" }
// result: { intent: "noop" }
```

### `createCrossFilterReducer(definitions)`

```ts
const reducer = createCrossFilterReducer(definitions);
const [state, dispatch] = useReducer(reducer, {});

dispatch({ type: "toggle",  id: "weekday", value: "Monday" });
dispatch({ type: "set",     id: "status",  values: ["Closed"] });
dispatch({ type: "clear",   id: "weekday" });
dispatch({ type: "clearAll" });
```

### `applyCrossFilters(table, state, options?)`

```ts
const filtered = applyCrossFilters(table, state, { exclude: ["weekday"] });
```

---

## Testing

Each module is pure and independently testable:

```ts
// Reducer
const reducer = createCrossFilterReducer([
  { id: "status", field: "status", mode: "single", clears: ["weekday"] }
]);
const s1 = reducer({}, { type: "set", id: "status", values: ["Closed"] });
expect(s1.status?.values).toEqual(["Closed"]);
expect(s1.weekday).toBeUndefined();

// Toggle off same value
const s2 = reducer(s1, { type: "toggle", id: "status", value: "Closed" });
expect(s2.status).toBeUndefined();

// Filter engine
const filtered = applyCrossFilters(
  table,
  { status: { field: "status", values: ["Closed"] } }
);
expect(filtered.rows.every(r => r[statusIdx] === "Closed")).toBe(true);

// Parser — select
const result = parseInteractionEvents(
  [{ action: "select", selections: [{ predicates: [{ type: "set", name: "weekday_name", values: ["Monday"] }] }] }],
  "weekday_name"
);
expect(result).toEqual({ intent: "select", field: "weekday_name", values: ["Monday"] });

// Parser — clear
const cleared = parseInteractionEvents([{ action: "clear" }], "weekday_name");
expect(cleared).toEqual({ intent: "clear" });
```

---

## File reference

| File | Role |
|---|---|
| `types.ts` | All shared TypeScript types |
| `event-parser.ts` | Raw Fabric events → normalized intent |
| `reducer.ts` | Pure reducer factory with toggle/clear semantics |
| `filter-engine.ts` | DataTable filtering with include/exclude scope |
| `use-cross-filters.ts` | React hook binding all primitives |
| `index.ts` | Barrel export |
