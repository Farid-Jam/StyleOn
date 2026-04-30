CREATE DATABASE IF NOT EXISTS STYLEON;
USE DATABASE STYLEON;
CREATE SCHEMA IF NOT EXISTS PUBLIC;
USE SCHEMA PUBLIC;

CREATE TABLE IF NOT EXISTS PRODUCTS (
  id STRING PRIMARY KEY,
  name STRING NOT NULL,
  brand STRING NOT NULL,
  category STRING NOT NULL,
  subcategory STRING NOT NULL,
  gender_fit STRING DEFAULT 'unisex',
  colors ARRAY,
  season_palette ARRAY,
  aesthetic_tags ARRAY,
  available_sizes ARRAY,
  material STRING,
  price NUMBER(10, 2) NOT NULL,
  currency STRING DEFAULT 'CAD',
  image_url STRING,
  try_on_ready_image_url STRING,
  product_url STRING,
  source STRING,
  description STRING,
  in_stock BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS OUTFITS (
  id STRING PRIMARY KEY,
  name STRING NOT NULL,
  aesthetic STRING,
  season_palette ARRAY,
  occasion STRING,
  total_price NUMBER(10, 2),
  image_url STRING
);

CREATE TABLE IF NOT EXISTS OUTFIT_ITEMS (
  outfit_id STRING REFERENCES OUTFITS(id),
  product_id STRING REFERENCES PRODUCTS(id),
  layer_type STRING,
  sort_order NUMBER
);

CREATE TABLE IF NOT EXISTS SAVED_CARTS (
  id STRING PRIMARY KEY,
  session_id STRING NOT NULL,
  total_price NUMBER(10, 2),
  currency STRING DEFAULT 'CAD',
  created_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

CREATE TABLE IF NOT EXISTS SAVED_CART_ITEMS (
  cart_id STRING REFERENCES SAVED_CARTS(id),
  product_id STRING REFERENCES PRODUCTS(id),
  quantity NUMBER,
  selected_size STRING,
  line_total NUMBER(10, 2)
);

CREATE TABLE IF NOT EXISTS SAVED_OUTFITS (
  id STRING PRIMARY KEY,
  session_id STRING NOT NULL,
  name STRING NOT NULL,
  occasion STRING,
  aesthetic STRING,
  color_season STRING,
  total_price NUMBER(10, 2),
  currency STRING DEFAULT 'CAD',
  created_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

CREATE TABLE IF NOT EXISTS SAVED_OUTFIT_ITEMS (
  outfit_id STRING REFERENCES SAVED_OUTFITS(id),
  product_id STRING REFERENCES PRODUCTS(id),
  sort_order NUMBER
);

CREATE TABLE IF NOT EXISTS TREND_COLLECTIONS (
  id STRING PRIMARY KEY,
  name STRING NOT NULL,
  aesthetic STRING NOT NULL,
  description STRING,
  season_palette ARRAY,
  created_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

CREATE TABLE IF NOT EXISTS TREND_COLLECTION_ITEMS (
  collection_id STRING REFERENCES TREND_COLLECTIONS(id),
  product_id STRING REFERENCES PRODUCTS(id)
);

CREATE TABLE IF NOT EXISTS COLOR_PALETTES (
  season STRING PRIMARY KEY,
  best_colors ARRAY,
  neutral_colors ARRAY,
  accent_colors ARRAY,
  avoid_colors ARRAY,
  description STRING,
  created_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

CREATE TABLE IF NOT EXISTS USER_STYLE_PROFILES (
  session_id STRING PRIMARY KEY,
  skin_tone_summary STRING,
  undertone STRING,
  color_season STRING,
  top_size STRING,
  bottom_size STRING,
  shoe_size STRING,
  fit_preference STRING,
  preferred_budget NUMBER(10, 2),
  preferred_aesthetics ARRAY,
  preferred_categories ARRAY,
  avoid_categories ARRAY,
  preferred_colors ARRAY,
  avoid_colors ARRAY,
  created_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

CREATE TABLE IF NOT EXISTS TAILOR_EVENTS (
  session_id STRING,
  user_message STRING,
  retrieved_product_ids ARRAY,
  model_response STRING,
  created_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);
