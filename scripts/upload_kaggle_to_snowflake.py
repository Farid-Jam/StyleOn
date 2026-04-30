#!/usr/bin/env python3
"""Upload generated Kaggle products CSV into Snowflake PRODUCTS."""

from __future__ import annotations

import argparse
import os
from pathlib import Path


REQUIRED_ENV = [
    "SNOWFLAKE_ACCOUNT",
    "SNOWFLAKE_USER",
    "SNOWFLAKE_PASSWORD",
    "SNOWFLAKE_WAREHOUSE",
]


def main() -> None:
    load_dotenv_file(Path(".env"))
    parser = argparse.ArgumentParser(description="Upload Styleon Kaggle products to Snowflake.")
    parser.add_argument("--csv-path", type=Path, default=Path("data/kaggle_products.csv"))
    parser.add_argument("--database", default=os.getenv("SNOWFLAKE_DATABASE", "STYLEON"))
    parser.add_argument("--schema", default=os.getenv("SNOWFLAKE_SCHEMA", "PUBLIC"))
    args = parser.parse_args()

    missing = [name for name in REQUIRED_ENV if not os.getenv(name)]
    if missing:
        raise RuntimeError(f"Missing required environment variables: {', '.join(missing)}")
    if not args.csv_path.exists():
        raise FileNotFoundError(f"Missing CSV file: {args.csv_path}")

    import snowflake.connector

    with snowflake.connector.connect(
        account=os.environ["SNOWFLAKE_ACCOUNT"],
        user=os.environ["SNOWFLAKE_USER"],
        password=os.environ["SNOWFLAKE_PASSWORD"],
        role=os.getenv("SNOWFLAKE_ROLE") or None,
        warehouse=os.environ["SNOWFLAKE_WAREHOUSE"],
    ) as con:
        cursor = con.cursor()
        execute_sql_file(cursor, Path("scripts/schema.sql"))
        cursor.execute(f"USE DATABASE {args.database}")
        cursor.execute(f"USE SCHEMA {args.schema}")
        cursor.execute("ALTER TABLE PRODUCTS ADD COLUMN IF NOT EXISTS available_sizes ARRAY")
        cursor.execute("ALTER TABLE PRODUCTS ADD COLUMN IF NOT EXISTS try_on_ready_image_url STRING")
        execute_sql_file(cursor, Path("scripts/load_kaggle_products.sql"), skip_put_comments=True)
        stage_file = args.csv_path.resolve()
        file_url = f"file://{stage_file}".replace("'", "''")
        cursor.execute(f"PUT '{file_url}' @STYLEON_PRODUCT_STAGE AUTO_COMPRESS=TRUE OVERWRITE=TRUE")
        cursor.execute("DELETE FROM PRODUCTS WHERE source = 'kaggle-paramaggarwal-fashion-products'")
        cursor.execute(copy_into_products_sql())
        print(f"Uploaded {args.csv_path} into {args.database}.{args.schema}.PRODUCTS")


def load_dotenv_file(path: Path) -> None:
    if not path.exists():
        return
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def execute_sql_file(cursor, path: Path, skip_put_comments: bool = False) -> None:
    sql = path.read_text()
    statements = []
    for statement in sql.split(";"):
        cleaned = "\n".join(
            line
            for line in statement.splitlines()
            if not (skip_put_comments and line.strip().startswith("-- PUT "))
        ).strip()
        if cleaned and not cleaned.startswith("--"):
            statements.append(cleaned)
    for statement in statements:
        if "COPY INTO PRODUCTS" in statement:
            continue
        cursor.execute(statement)


def copy_into_products_sql() -> str:
    return """
COPY INTO PRODUCTS (
  id, name, brand, category, subcategory, gender_fit, colors, season_palette,
  aesthetic_tags, available_sizes, material, price, currency, image_url, try_on_ready_image_url, product_url, source,
  description, in_stock
)
FROM (
  SELECT
    $1, $2, $3, $4, $5, $6,
    PARSE_JSON($7), PARSE_JSON($8), PARSE_JSON($9),
    PARSE_JSON($10), $11, $12::NUMBER(10, 2), $13, $14, $15, $16, $17, $18, $19::BOOLEAN
  FROM @STYLEON_PRODUCT_STAGE
)
ON_ERROR = CONTINUE
"""


if __name__ == "__main__":
    main()
