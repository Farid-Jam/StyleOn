USE DATABASE STYLEON;
USE SCHEMA PUBLIC;

INSERT INTO PRODUCTS (
  id, name, brand, category, subcategory, gender_fit, colors, season_palette,
  aesthetic_tags, material, price, currency, image_url, product_url, source,
  description, in_stock
)
SELECT * FROM VALUES
  ('top-001', 'Olive Ribbed Knit Sweater', 'Styleon Studio', 'tops', 'sweater', 'unisex',
    ARRAY_CONSTRUCT('olive', 'green'), ARRAY_CONSTRUCT('Warm Autumn', 'Soft Autumn'),
    ARRAY_CONSTRUCT('minimal', 'cozy', 'earthy'), 'cotton blend', 58.00, 'CAD',
    'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633', 'https://example.com/products/top-001',
    'demo-curated', 'Ribbed sweater with a soft olive tone that works well for warm palettes.', TRUE),
  ('bottom-001', 'Straight Leg Dark Denim', 'North Thread', 'bottoms', 'pants', 'unisex',
    ARRAY_CONSTRUCT('indigo', 'navy'), ARRAY_CONSTRUCT('Deep Winter', 'Cool Winter', 'Soft Summer'),
    ARRAY_CONSTRUCT('classic', 'streetwear', 'minimal'), 'denim', 74.00, 'CAD',
    'https://images.unsplash.com/photo-1542272604-787c3835535d', 'https://example.com/products/bottom-001',
    'demo-curated', 'Dark denim pant that anchors casual and polished outfits.', TRUE),
  ('outer-001', 'Camel Relaxed Coat', 'Avenue Layer', 'outerwear', 'coat', 'unisex',
    ARRAY_CONSTRUCT('camel', 'tan'), ARRAY_CONSTRUCT('Warm Autumn', 'Warm Spring'),
    ARRAY_CONSTRUCT('old money', 'classic', 'minimal'), 'wool blend', 138.00, 'CAD',
    'https://images.unsplash.com/photo-1544022613-e87ca75a784a', 'https://example.com/products/outer-001',
    'demo-curated', 'Camel coat for warm-neutral outfits and elevated everyday styling.', TRUE),
  ('shoe-001', 'White Low Profile Sneaker', 'Clean Step', 'shoes', 'sneakers', 'unisex',
    ARRAY_CONSTRUCT('white'), ARRAY_CONSTRUCT('Cool Winter', 'Clear Spring', 'Soft Summer'),
    ARRAY_CONSTRUCT('minimal', 'streetwear', 'classic'), 'vegan leather', 82.00, 'CAD',
    'https://images.unsplash.com/photo-1549298916-b41d501d3772', 'https://example.com/products/shoe-001',
    'demo-curated', 'Clean sneaker that pairs with most casual outfits.', TRUE);

INSERT INTO TREND_COLLECTIONS (id, name, aesthetic, description, season_palette)
SELECT * FROM VALUES
  ('trend-warm-autumn-classic', 'Warm Autumn Classics', 'classic',
   'Camel, olive, denim, and gold pieces for a polished warm palette.',
   ARRAY_CONSTRUCT('Warm Autumn'));

INSERT INTO TREND_COLLECTION_ITEMS (collection_id, product_id)
SELECT * FROM VALUES
  ('trend-warm-autumn-classic', 'top-001'),
  ('trend-warm-autumn-classic', 'bottom-001'),
  ('trend-warm-autumn-classic', 'outer-001');

INSERT INTO COLOR_PALETTES (
  season, best_colors, neutral_colors, accent_colors, avoid_colors, description
)
SELECT
  'Warm Autumn',
  ARRAY_CONSTRUCT('olive', 'rust', 'terracotta', 'mustard', 'warm brown'),
  ARRAY_CONSTRUCT('cream', 'camel', 'espresso', 'warm beige'),
  ARRAY_CONSTRUCT('teal', 'burnt orange', 'antique gold'),
  ARRAY_CONSTRUCT('icy blue', 'cool gray', 'neon pink', 'stark white'),
  'Warm, earthy colors with golden undertones.'
UNION ALL SELECT
  'Cool Winter',
  ARRAY_CONSTRUCT('black', 'white', 'cobalt', 'emerald', 'true red'),
  ARRAY_CONSTRUCT('charcoal', 'navy', 'cool gray'),
  ARRAY_CONSTRUCT('fuchsia', 'royal purple', 'silver'),
  ARRAY_CONSTRUCT('camel', 'mustard', 'orange', 'muddy brown'),
  'High contrast, crisp colors with cool undertones.'
UNION ALL SELECT
  'Deep Winter',
  ARRAY_CONSTRUCT('black', 'burgundy', 'pine green', 'deep navy', 'plum'),
  ARRAY_CONSTRUCT('charcoal', 'espresso', 'optic white'),
  ARRAY_CONSTRUCT('ruby', 'sapphire', 'icy pink'),
  ARRAY_CONSTRUCT('pastel peach', 'warm beige', 'dusty orange'),
  'Deep, saturated colors with strong contrast.';
