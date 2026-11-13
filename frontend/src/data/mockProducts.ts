// Dữ liệu phục vụ trình diễn UI; giá, tồn kho và đánh giá không phải thông tin bán hàng thật.
export interface MockProduct {
  id: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  originalPrice: number;
  processor: string;
  ram: number;
  storage: string;
  display: string;
  rating: number;
  reviews: number;
  stock: number;
  color: string;
  badge?: string;
  kind: 'laptop' | 'phone' | 'tablet' | 'headphones';
}

export const mockProducts: MockProduct[] = [
  { id: 'asus-01', name: 'ASUS Vivobook 15 OLED', brand: 'ASUS', category: 'Laptop', price: 15990000, originalPrice: 18490000, processor: 'Intel Core i5', ram: 16, storage: '512GB SSD', display: '15.6 inch · OLED', rating: 4.8, reviews: 86, stock: 12, color: '#3459b8', badge: 'Bán chạy', kind: 'laptop' },
  { id: 'apple-01', name: 'MacBook Air 13 inch M3', brand: 'Apple', category: 'Laptop', price: 26490000, originalPrice: 28990000, processor: 'Apple M3', ram: 16, storage: '256GB SSD', display: '13.6 inch · Liquid Retina', rating: 4.9, reviews: 214, stock: 8, color: '#7473bd', badge: 'Được yêu thích', kind: 'laptop' },
  { id: 'lenovo-01', name: 'Lenovo IdeaPad Slim 5', brand: 'Lenovo', category: 'Laptop', price: 19490000, originalPrice: 21490000, processor: 'AMD Ryzen 7', ram: 16, storage: '512GB SSD', display: '14 inch · WUXGA', rating: 4.7, reviews: 72, stock: 15, color: '#508d9c', kind: 'laptop' },
  { id: 'acer-01', name: 'Acer Swift Go 14', brand: 'Acer', category: 'Laptop', price: 20990000, originalPrice: 23990000, processor: 'Intel Core Ultra 5', ram: 16, storage: '512GB SSD', display: '14 inch · OLED', rating: 4.8, reviews: 58, stock: 6, color: '#b27c53', badge: 'Giá tốt', kind: 'laptop' },
  { id: 'hp-01', name: 'HP Pavilion 14', brand: 'HP', category: 'Laptop', price: 17490000, originalPrice: 19990000, processor: 'Intel Core i5', ram: 16, storage: '512GB SSD', display: '14 inch · Full HD', rating: 4.6, reviews: 41, stock: 10, color: '#7b8cba', kind: 'laptop' },
  { id: 'dell-01', name: 'Dell Inspiron 14', brand: 'Dell', category: 'Laptop', price: 18990000, originalPrice: 20990000, processor: 'Intel Core 5', ram: 16, storage: '512GB SSD', display: '14 inch · Full HD+', rating: 4.7, reviews: 63, stock: 4, color: '#357b9a', kind: 'laptop' },
  { id: 'asus-02', name: 'ASUS TUF Gaming A15', brand: 'ASUS', category: 'Laptop', price: 24990000, originalPrice: 27990000, processor: 'AMD Ryzen 7', ram: 16, storage: '1TB SSD', display: '15.6 inch · 144Hz', rating: 4.8, reviews: 103, stock: 5, color: '#9960c3', badge: 'Gaming', kind: 'laptop' },
  { id: 'apple-02', name: 'MacBook Pro 14 inch M3', brand: 'Apple', category: 'Laptop', price: 36990000, originalPrice: 39990000, processor: 'Apple M3', ram: 16, storage: '512GB SSD', display: '14.2 inch · Retina XDR', rating: 4.9, reviews: 126, stock: 3, color: '#476694', kind: 'laptop' },
  { id: 'lenovo-02', name: 'Lenovo LOQ 15', brand: 'Lenovo', category: 'Laptop', price: 22990000, originalPrice: 24990000, processor: 'Intel Core i7', ram: 16, storage: '512GB SSD', display: '15.6 inch · 144Hz', rating: 4.7, reviews: 49, stock: 0, color: '#a65863', kind: 'laptop' },
  { id: 'hp-02', name: 'HP 15s Essential', brand: 'HP', category: 'Laptop', price: 11490000, originalPrice: 12990000, processor: 'Intel Core i3', ram: 8, storage: '256GB SSD', display: '15.6 inch · Full HD', rating: 4.5, reviews: 32, stock: 20, color: '#6c9a86', kind: 'laptop' },
  { id: 'phone-01', name: 'iPhone 15 128GB', brand: 'Apple', category: 'Điện thoại', price: 16990000, originalPrice: 19990000, processor: 'Apple A16 Bionic', ram: 6, storage: '128GB', display: '6.1 inch · Super Retina', rating: 4.9, reviews: 185, stock: 12, color: '#7c9eba', badge: 'Bán chạy', kind: 'phone' },
  { id: 'phone-02', name: 'Samsung Galaxy S24', brand: 'Samsung', category: 'Điện thoại', price: 15990000, originalPrice: 18990000, processor: 'Exynos 2400', ram: 8, storage: '256GB', display: '6.2 inch · AMOLED', rating: 4.8, reviews: 96, stock: 7, color: '#a39ac2', kind: 'phone' },
  { id: 'tablet-01', name: 'iPad Air 11 inch M2', brand: 'Apple', category: 'Máy tính bảng', price: 14990000, originalPrice: 16990000, processor: 'Apple M2', ram: 8, storage: '128GB', display: '11 inch · Liquid Retina', rating: 4.8, reviews: 64, stock: 8, color: '#598cbb', kind: 'tablet' },
  { id: 'audio-01', name: 'Sony WH-1000XM5', brand: 'Sony', category: 'Phụ kiện', price: 6490000, originalPrice: 8490000, processor: 'Chống ồn chủ động', ram: 0, storage: 'Bluetooth 5.2', display: 'Pin đến 30 giờ', rating: 4.9, reviews: 118, stock: 16, color: '#5b6370', badge: 'Giá tốt', kind: 'headphones' },
];
