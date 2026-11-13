\set ON_ERROR_STOP on
\ir schema.sql
\ir migrations/002_uc16_uc17_uc19.sql
\ir migrations/003_images_metadata.sql
\ir migrations/004_allow_unknown_release_year.sql
\ir 01_import_phongvu_catalog.sql
\ir 03_check_import.sql
