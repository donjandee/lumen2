"""DuckDB data layer — runs SQL directly on uploaded CSV files."""

import json
import duckdb
import pandas as pd
from pathlib import Path


class DataStore:
    """Manages DuckDB connections over uploaded datasets."""

    def __init__(self) -> None:
        self._conn = duckdb.connect("lumen.duckdb")
        self._tables: dict[str, Path] = {}
        # Load existing tables from the database
        existing = self._conn.execute(
            "SELECT table_name FROM information_schema.tables WHERE table_schema='main'"
        ).fetchall()
        for (name,) in existing:
            self._tables[name] = Path("")

    def load_csv(self, file_path: Path, table_name: str | None = None) -> str:
        """Load a CSV into DuckDB as a table. Returns the table name."""
        name = table_name or file_path.stem.replace(" ", "_").replace("-", "_")
        name = "".join(c if c.isalnum() or c == "_" else "_" for c in name)
        self._conn.execute(
            f"CREATE OR REPLACE TABLE {name} AS SELECT * FROM read_csv_auto(?)",
            [str(file_path)],
        )
        self._tables[name] = file_path
        return name

    def query(self, sql: str) -> pd.DataFrame:
        """Execute a read-only SQL query and return results as DataFrame."""
        return self._conn.execute(sql).fetchdf()

    def profile(self, table_name: str) -> dict:
        """Return schema, dtypes, null counts, and sample rows for a table."""
        schema = self._conn.execute(
            f"DESCRIBE {table_name}"
        ).fetchdf().to_dict(orient="records")

        row_count = self._conn.execute(
            f"SELECT COUNT(*) as cnt FROM {table_name}"
        ).fetchone()[0]

        null_counts = {}
        for col in schema:
            col_name = col["column_name"]
            count = self._conn.execute(
                f'SELECT COUNT(*) FROM {table_name} WHERE "{col_name}" IS NULL'
            ).fetchone()[0]
            null_counts[col_name] = count

        sample_df = self._conn.execute(
            f"SELECT * FROM {table_name} LIMIT 5"
        ).fetchdf()
        sample = json.loads(sample_df.to_json(orient="records", date_format="iso"))

        return {
            "table_name": table_name,
            "row_count": row_count,
            "columns": schema,
            "null_counts": null_counts,
            "sample_rows": sample,
        }

    @property
    def tables(self) -> list[str]:
        return list(self._tables.keys())


# Singleton instance
data_store = DataStore()
