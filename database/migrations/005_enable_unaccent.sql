-- PA4 | UC17 | Bat buoc cho tim kiem khong dau (unaccent).
-- Chay 1 lan tren moi DB (local qua 00_install_clean_psql.sql, Supabase qua SQL Editor).
-- Kiem tra nhanh sau khi chay:
--   SELECT translate(unaccent(lower('Điện thoại')), 'đ', 'd');  -- 'dien thoai'
CREATE EXTENSION IF NOT EXISTS unaccent;
