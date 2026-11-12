\set ON_ERROR_STOP on
\ir schema.sql
\ir migrations/002_uc16_uc17_uc19.sql
\ir migrations/003_images_metadata.sql
\ir 01_import_phongvu_catalog.sql
\ir seed/seed-products.sql
\ir 03_check_import.sql
