import {DataGrid} from "@microsoft/fabric-datagrid";
import {toDataTable} from "./lib/to-data-table";
import {useSemanticModelQuery} from "./hooks/use-semantic-model-query";
import {basicTableQuery} from "./queries/basic-table-query";

export function DaxResultTable() {
    const {connection, query, columnMetadata} = basicTableQuery();
    const {data, isLoading, error} = useSemanticModelQuery({connection, query,});

    if (isLoading) return <p>Loading...</p>;
    if (error) return <p>Error: {error.message}</p>;
    if (data?.status !== "success") return <p></p>;

    const dataTable = toDataTable(data.table, columnMetadata);

    return (
        <div className="mx-auto mt-xl w-full max-w-5xl rounded-lg border border-border bg-card p-l shadow-sm">
            <h1 className="text-500 font-semibold pb-s">DAX Query Results</h1>
            <DataGrid data={dataTable} />
        </div>
    );
}