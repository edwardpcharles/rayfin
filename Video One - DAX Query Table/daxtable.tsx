import daxScript from "./dax/query.dax?raw";
import { useSemanticModelQuery } from "./hooks/use-semantic-model-query";

export function Daxtable() {
    const connection = "salesModel";
    const {data, isLoading, error} = useSemanticModelQuery({connection, query:daxScript,});

    if (isLoading) {
        return <p>Running Query...</p>;
    }   

    if (error) {
        return <p>Error: {error.message}</p>;
    }

    if(data?.status !== "success") {
        return null;
    }

    const table = data.table;

    return (
        <div className="mx-auto mt-xl w-full max-w-5xl rounded-lg border border-border bg-card p-l shadow-sm">
            <h1 className="text-500 font-semibold">Dax Query Results</h1>
            <table className="mt-m w-full border-collapse text-200">
                <thead className="bg-muted/60">
                    <tr>
                        {table.columns.map((column) => (
                            <th key={column.name} className="px-s py-xs text-left font-semibold">{column.name}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {table.rows.map((row, rowIndex) => (
                        <tr key={rowIndex} className="border-t border-border">
                            {table.columns.map((column, columnIndex) => (
                                <td key={`${column.name}-${rowIndex}`} className="px-s py-xs font-monospace">{String((row as unknown[])[columnIndex])}</td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}