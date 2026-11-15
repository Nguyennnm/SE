import type { SpecSelection } from './product.facets.js';

export interface ProductImage {
  id?: number | string;
  image_url: string;
  alt_text?: string;
  is_primary?: boolean;
}

export interface ProductVariant {
  id?: number | string;
  sku: string;
  variant_name: string;
  ram_gb?: number;
  storage_gb?: number;
  price_vnd: number;
  selling_price_vnd?: number;
  stock: number;
  is_active: boolean;
  specifications?: Record<string, any>;
  short_description?: string;
}

export interface Product {
  id: string | number;
  code?: string;
  slug: string;
  model_name: string;
  name: string;
  category: string;
  category_code: string;
  brand: string;
  price: number;
  original_price?: number;
  selling_price_vnd?: number;
  stock: number;
  // Chua co bang danh gia (UC26 nam ngoai pham vi PA4): duong DB that tra NULL,
  // khong bia so lieu. Du lieu mock van co rating that de test.
  rating: number | null;
  review_count: number | null;
  image_url?: string;
  images?: ProductImage[];
  variants?: ProductVariant[];
  specifications?: Record<string, any>;
  short_description?: string;
  description?: string;
  warranty_months?: number;
  is_active: boolean;
}

export interface ProductSearchParams extends SpecSelection {
  ids?: string[];
  q?: string;
  category?: string;
  brand?: string | string[];
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  sort?: 'relevant' | 'asc' | 'desc' | 'rating';
  page?: number;
  limit?: number;
}

export interface ProductSearchResult {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Bộ dữ liệu mẫu kiểm thử theo Section 1.5 trong TestPlan-TestCase.pdf
export const MOCK_TEST_PRODUCTS: Product[] = [
  {
    id: 'SP001',
    code: 'SP001',
    slug: 'iphone-16',
    model_name: 'iPhone 16',
    name: 'iPhone 16 (128GB - Titan Tự Nhiên)',
    category: 'Điện thoại',
    category_code: 'phone',
    brand: 'Apple',
    price: 20000000,
    original_price: 22990000,
    selling_price_vnd: 20000000,
    stock: 10,
    rating: 4.8,
    review_count: 142,
    image_url: 'https://lh3.googleusercontent.com/sample-iphone16.png',
    warranty_months: 12,
    is_active: true,
    specifications: {
      cpu: 'Apple A18 Bionic',
      ram: '8GB',
      storage: '128GB',
      screen: '6.1 inch Super Retina XDR OLED',
      battery: '3561 mAh',
    },
    short_description: 'iPhone 16 trang bị chip A18 thế hệ mới cùng nút điều khiển camera chuyên biệt.',
    variants: [
      {
        sku: 'IP16-128-BLK',
        variant_name: 'iPhone 16 128GB Đen',
        ram_gb: 8,
        storage_gb: 128,
        price_vnd: 20000000,
        selling_price_vnd: 20000000,
        stock: 10,
        is_active: true,
      },
      {
        sku: 'IP16-256-WHT',
        variant_name: 'iPhone 16 256GB Trắng',
        ram_gb: 8,
        storage_gb: 256,
        price_vnd: 22990000,
        selling_price_vnd: 22990000,
        stock: 8,
        is_active: true,
      },
      {
        sku: 'IP16-512-TI',
        variant_name: 'iPhone 16 512GB Titan Tự Nhiên',
        ram_gb: 8,
        storage_gb: 512,
        price_vnd: 28990000,
        selling_price_vnd: 28990000,
        stock: 5,
        is_active: true,
      },
    ],
  },
  {
    id: 'SP002',
    code: 'SP002',
    slug: 'samsung-galaxy-s25',
    model_name: 'Samsung Galaxy S25',
    name: 'Samsung Galaxy S25 5G (8GB/256GB)',
    category: 'Điện thoại',
    category_code: 'phone',
    brand: 'Samsung',
    price: 18000000,
    original_price: 20990000,
    selling_price_vnd: 18000000,
    stock: 5,
    rating: 4.7,
    review_count: 98,
    image_url: 'https://lh3.googleusercontent.com/sample-s25.png',
    warranty_months: 12,
    is_active: true,
    specifications: {
      cpu: 'Snapdragon 8 Elite',
      ram: '8GB',
      storage: '256GB',
      screen: '6.2 inch Dynamic AMOLED 2X 120Hz',
    },
    short_description: 'Galaxy S25 với Galaxy AI toàn diện và camera 50MP ProVisual Engine.',
  },
  {
    id: 'SP003',
    code: 'SP003',
    slug: 'macbook-air-m4',
    model_name: 'MacBook Air M4',
    name: 'MacBook Air 13 M4 (16GB / 256GB)',
    category: 'Laptop',
    category_code: 'laptop',
    brand: 'Apple',
    price: 25000000,
    original_price: 27990000,
    selling_price_vnd: 25000000,
    stock: 8,
    rating: 4.9,
    review_count: 85,
    image_url: 'https://lh3.googleusercontent.com/sample-macbook-m4.png',
    warranty_months: 12,
    is_active: true,
    specifications: {
      cpu: 'Apple M4 10-core',
      ram: '16GB Unified Memory',
      storage: '256GB SSD',
      screen: '13.6 inch Liquid Retina',
    },
    short_description: 'MacBook Air trang bị chip M4 siêu mạnh mẽ với thời lượng pin đến 18 giờ.',
  },
  {
    id: 'SP004',
    code: 'SP004',
    slug: 'asus-vivobook-15',
    model_name: 'ASUS Vivobook',
    name: 'Laptop ASUS Vivobook 15 X1504ZA',
    category: 'Laptop',
    category_code: 'laptop',
    brand: 'ASUS',
    price: 15000000,
    original_price: 17990000,
    selling_price_vnd: 15000000,
    stock: 0, // Hết hàng / Ngừng kinh doanh kiểm thử TC16-02 và TC17-02
    rating: 4.5,
    review_count: 63,
    image_url: 'https://lh3.googleusercontent.com/sample-vivobook.png',
    warranty_months: 24,
    is_active: false, // Dành cho TC16-02 kiểm thử sản phẩm ngừng kinh doanh
    specifications: {
      cpu: 'Intel Core i5-1235U',
      ram: '16GB DDR4',
      storage: '512GB SSD',
      screen: '15.6 inch Full HD OLED',
    },
    short_description: 'ASUS Vivobook 15 màn hình lớn mỏng nhẹ, bản lề mở 180 độ.',
  },
  {
    id: 'SP005',
    code: 'SP005',
    slug: 'xiaomi-redmi-note',
    model_name: 'Xiaomi Redmi Note',
    name: 'Điện thoại Xiaomi Redmi Note 13 (6GB/128GB)',
    category: 'Điện thoại',
    category_code: 'phone',
    brand: 'Xiaomi',
    price: 5000000,
    original_price: 5990000,
    selling_price_vnd: 5000000,
    stock: 20,
    rating: 4.4,
    review_count: 215,
    image_url: 'https://lh3.googleusercontent.com/sample-redmi.png',
    warranty_months: 18,
    is_active: true,
    specifications: {
      cpu: 'Snapdragon 685',
      ram: '6GB',
      storage: '128GB',
      screen: '6.67 inch AMOLED 120Hz',
    },
    short_description: 'Redmi Note với camera 108MP và màn hình AMOLED siêu nét phân khúc giá rẻ.',
  },
  // Bổ sung các sản phẩm catalog phục vụ test filter đa dạng
  {
    id: 'SP006',
    code: 'SP006',
    slug: 'ipad-air-m2',
    model_name: 'iPad Air M2',
    name: 'Máy tính bảng Apple iPad Air M2 11 inch Wi-Fi 128GB',
    category: 'Máy tính bảng',
    category_code: 'tablet',
    brand: 'Apple',
    price: 16990000,
    original_price: 18990000,
    selling_price_vnd: 16990000,
    stock: 12,
    rating: 4.8,
    review_count: 47,
    image_url: 'https://lh3.googleusercontent.com/sample-ipad.png',
    warranty_months: 12,
    is_active: true,
    specifications: {
      cpu: 'Apple M2 8-core',
      ram: '8GB',
      storage: '128GB',
      screen: '11 inch Liquid Retina',
    },
  },
  {
    id: 'SP007',
    code: 'SP007',
    slug: 'samsung-galaxy-tab-s10',
    model_name: 'Galaxy Tab S10 Plus',
    name: 'Máy tính bảng Samsung Galaxy Tab S10+ 5G (12GB/256GB)',
    category: 'Máy tính bảng',
    category_code: 'tablet',
    brand: 'Samsung',
    price: 24990000,
    original_price: 27990000,
    selling_price_vnd: 24990000,
    stock: 6,
    rating: 4.7,
    review_count: 31,
    image_url: 'https://lh3.googleusercontent.com/sample-tabs10.png',
    warranty_months: 12,
    is_active: true,
    specifications: {
      cpu: 'MediaTek Dimensity 9300+',
      ram: '12GB',
      storage: '256GB',
      screen: '12.4 inch Dynamic AMOLED 2X',
    },
  },
  {
    id: 'SP008',
    code: 'SP008',
    slug: 'lenovo-ideapad-slim-5',
    model_name: 'Lenovo IdeaPad Slim 5',
    name: 'Laptop Lenovo IdeaPad Slim 5 14IRH8',
    category: 'Laptop',
    category_code: 'laptop',
    brand: 'Lenovo',
    price: 19490000,
    original_price: 21990000,
    selling_price_vnd: 19490000,
    stock: 15,
    rating: 4.6,
    review_count: 72,
    image_url: 'https://lh3.googleusercontent.com/sample-ideapad.png',
    warranty_months: 24,
    is_active: true,
    specifications: {
      cpu: 'AMD Ryzen 7 7730U',
      ram: '16GB DDR4',
      storage: '512GB SSD',
      screen: '14 inch WUXGA IPS',
    },
  },
];
