"""Regression checks for hardware brands and SKU-preserving model grouping."""
import json
import unittest
from pathlib import Path
from replace_catalog_repo import brand_from_name, infer_model_group


class CatalogGroupsTest(unittest.TestCase):
    def test_bundled_software_does_not_override_hardware_brand(self):
        for brand in ['Lenovo', 'Dell', 'HP', 'ASUS']:
            with self.subTest(brand=brand):
                self.assertEqual(brand_from_name(f'Laptop {brand} Example (16GB/512GB/Office + Microsoft)'), brand)
        self.assertEqual(brand_from_name('Laptop Microsoft Surface Pro (Office)'), 'Microsoft')
        self.assertEqual(brand_from_name('MacBook Air M4 (Microsoft Office)'), 'Apple')

    def test_capacities_group_but_different_models_stay_separate(self):
        a = infer_model_group('phone', 'Apple', 'Apple iPhone 16 128GB - Đen', 'sku1')[0]
        b = infer_model_group('phone', 'Apple', 'Apple iPhone 16 256GB - Trắng', 'sku2')[0]
        c = infer_model_group('phone', 'Apple', 'Apple iPhone 16 Pro 256GB - Trắng', 'sku3')[0]
        self.assertEqual(a, b)
        self.assertNotEqual(a, c)

    def test_snapshot_is_consistent_and_keeps_every_sku(self):
        rows = json.loads((Path(__file__).resolve().parents[1] / 'data/phongvu_catalog_current.json').read_text(encoding='utf-8'))
        self.assertEqual(len(rows), 703)
        self.assertEqual(len({r['seller_sku'] for r in rows}), 703)
        self.assertEqual(len({r['model_slug'] for r in rows}), 365)
        for row in rows:
            self.assertEqual(row['brand'], brand_from_name(row['product_name']), row['seller_sku'])
            self.assertEqual(row['model_slug'], infer_model_group(row['category'], row['brand'], row['product_name'], row['seller_sku'])[0])
        lenovo = [r for r in rows if r['model_display_name'] == 'Laptop Lenovo IdeaPad Slim 3 14IWC11']
        self.assertGreater(len(lenovo), 1)
        self.assertEqual(len({r['model_slug'] for r in lenovo}), 1)


if __name__ == '__main__':
    unittest.main()
