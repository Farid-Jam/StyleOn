USE DATABASE STYLEON;
USE SCHEMA PUBLIC;

CREATE OR REPLACE FILE FORMAT STYLEON_PRODUCTS_CSV
  TYPE = CSV
  SKIP_HEADER = 1
  FIELD_OPTIONALLY_ENCLOSED_BY = '"'
  NULL_IF = ('', 'NULL', 'null')
  EMPTY_FIELD_AS_NULL = TRUE;

CREATE STAGE IF NOT EXISTS STYLEON_PRODUCT_STAGE
  FILE_FORMAT = STYLEON_PRODUCTS_CSV;

-- In SnowSQL or Snowsight, upload the generated CSV first:
-- PUT file://data/kaggle_products.csv @STYLEON_PRODUCT_STAGE AUTO_COMPRESS=TRUE;

COPY INTO PRODUCTS (
  id,
  name,
  brand,
  category,
  subcategory,
  gender_fit,
  colors,
  season_palette,
  aesthetic_tags,
  available_sizes,
  material,
  price,
  currency,
  image_url,
  try_on_ready_image_url,
  product_url,
  source,
  description,
  in_stock
)
FROM (
  SELECT
    $1,
    $2,
    $3,
    $4,
    $5,
    $6,
    PARSE_JSON($7),
    PARSE_JSON($8),
    PARSE_JSON($9),
    PARSE_JSON($10),
    $11,
    $12::NUMBER(10, 2),
    $13,
    $14,
    $15,
    $16,
    $17,
    $18,
    $19::BOOLEAN
  FROM @STYLEON_PRODUCT_STAGE
)
ON_ERROR = CONTINUE;
