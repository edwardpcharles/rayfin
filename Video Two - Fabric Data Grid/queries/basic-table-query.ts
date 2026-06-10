import basequery from "../dax/query.dax?raw";
import type { ColumnMetadataMap } from "../lib/to-data-table";

const columnMetadata: ColumnMetadataMap = {
    "'Fact Table'[status]": {name: "status", displayName: "Status"},
    "Total Sales" : {name: "totalSales", displayName: "Total Sales", format: "$0,0"},
};

export function basicTableQuery() {
    return {connection: "salesModel", query: basequery, columnMetadata};
}