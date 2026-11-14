import app from '../src/app.js';
import { checkDatabaseConnection, isDatabaseConnected } from '../src/config/database.js';
import type { Server } from 'http';
import type { AddressInfo } from 'net';

interface TestResult {
  name: string;
  testCaseId: string;
  passed: boolean;
  error?: string;
  details?: any;
}

const results: TestResult[] = [];

async function runTestSuite() {
  console.log('================================================================');
  console.log(' BỘ KIỂM THỬ TỰ ĐỘNG - API TÌM KIẾM SẢN PHẨM (UC17 & UC16)');
  console.log(' Đề án: Smart Electronics Store (CSC13002 - Nhóm 07)');
  console.log(' Phân công: Hoàng Lê Đăng Khoa (MSSV: 24120343)');
  console.log(' Căn cứ: PA4-Group07/TestPlan-TestCase.pdf (Mục 2.2)');
  console.log('================================================================\n');

  // Ket noi DB truoc (neu co): tu nay test moi thuc su chay duong DB
  // thay vi luc nao cung roi ve mock nhu truoc. Khong co DB -> chay mock.
  const dbMode = await checkDatabaseConnection();
  console.log(
    dbMode
      ? '[Test] Che do DATABASE (PostgreSQL) - kiem tra duong truy van that'
      : '[Test] Che do MOCK (khong co PostgreSQL) - chi kiem tra logic API + du lieu mau'
  );

  // Khởi động test server trên ephemeral port
  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });

  const port = (server.address() as AddressInfo).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  console.log(`[Test Server] Đang chạy kiểm thử tại: ${baseUrl}\n`);

  try {
    // -------------------------------------------------------------
    // TC17-01: Tìm kiếm sản phẩm với từ khóa hợp lệ
    // -------------------------------------------------------------
    try {
      const res = await fetch(`${baseUrl}/api/products/search?q=iPhone 16`);
      const data = await res.json();

      const passed =
        res.status === 200 &&
        data.success === true &&
        Array.isArray(data.data) &&
        data.data.length > 0 &&
        data.data.some((p: any) => p.name.toLowerCase().includes('iphone 16')) &&
        data.data[0].id &&
        data.data[0].variants?.length > 0;

      results.push({
        name: 'Tìm kiếm sản phẩm với từ khóa hợp lệ ("iPhone 16")',
        testCaseId: 'TC17-01',
        passed,
        details: {
          status: res.status,
          total: data.pagination?.total,
          firstProductName: data.data?.[0]?.name,
          firstProductPrice: data.data?.[0]?.variants?.[0]?.price_vnd || data.data?.[0]?.price,
        },
      });
    } catch (err: any) {
      results.push({
        name: 'Tìm kiếm sản phẩm với từ khóa hợp lệ ("iPhone 16")',
        testCaseId: 'TC17-01',
        passed: false,
        error: err.message,
      });
    }

    // -------------------------------------------------------------
    // TC17-02: Tìm kiếm kết hợp nhiều bộ lọc (AND Logic)
    // Category: phone/Điện thoại AND Brand: Apple AND MaxPrice: 22.000.000
    // -------------------------------------------------------------
    try {
      const res = await fetch(
        `${baseUrl}/api/products/search?category=phone&brand=Apple&maxPrice=22000000`
      );
      const data = await res.json();

      // Kiểm tra tất cả sản phẩm trả về:
      // 1. Phải là Điện thoại (category_code: phone hoặc category: Điện thoại)
      // 2. Phải là hãng Apple
      // 3. Giá bán tối thiểu hoặc giá variant phải <= 22.000.000
      // 4. Tuyệt đối KHÔNG có MacBook (Laptop) dù cùng hãng Apple
      const hasOnlyMatchingProducts =
        data.data.length > 0 &&
        data.data.every((p: any) => {
          const isCategory =
            p.category_code === 'phone' ||
            p.category?.toLowerCase().includes('điện thoại');
          const isApple = p.brand?.toLowerCase() === 'apple';
          const hasAffordablePrice =
            p.price <= 22000000 ||
            p.variants?.some((v: any) => (v.price_vnd || v.price) <= 22000000);
          return isCategory && isApple && hasAffordablePrice;
        });

      const noLaptopApple = !data.data.some((p: any) =>
        p.name.toLowerCase().includes('macbook')
      );

      const passed =
        res.status === 200 &&
        data.success === true &&
        hasOnlyMatchingProducts &&
        noLaptopApple;

      results.push({
        name: 'Tìm kiếm kết hợp nhiều bộ lọc (Category=phone, Brand=Apple, MaxPrice=22M)',
        testCaseId: 'TC17-02',
        passed,
        details: {
          status: res.status,
          total: data.pagination?.total,
          products: data.data.map((p: any) => `${p.name} (${p.category} - ${p.brand})`),
          noLaptopAppleExcluded: noLaptopApple,
        },
      });
    } catch (err: any) {
      results.push({
        name: 'Tìm kiếm kết hợp nhiều bộ lọc (AND Logic)',
        testCaseId: 'TC17-02',
        passed: false,
        error: err.message,
      });
    }

    // -------------------------------------------------------------
    // TC17-03: Tìm kiếm với tiêu chí để trống (Mặc định danh sách)
    // -------------------------------------------------------------
    try {
      const res = await fetch(`${baseUrl}/api/products/search`);
      const data = await res.json();

      const passed =
        res.status === 200 &&
        data.success === true &&
        Array.isArray(data.data) &&
        data.data.length > 0 &&
        data.pagination?.page === 1 &&
        data.pagination?.pageSize >= 1;

      results.push({
        name: 'Tìm kiếm với tiêu chí để trống (Hiển thị danh sách mặc định có phân trang)',
        testCaseId: 'TC17-03',
        passed,
        details: {
          status: res.status,
          total: data.pagination?.total,
          page: data.pagination?.page,
          pageSize: data.pagination?.pageSize,
          returnedCount: data.data?.length,
        },
      });
    } catch (err: any) {
      results.push({
        name: 'Tìm kiếm với tiêu chí để trống',
        testCaseId: 'TC17-03',
        passed: false,
        error: err.message,
      });
    }

    // -------------------------------------------------------------
    // TC17-04: Tìm kiếm sản phẩm không tồn tại trong hệ thống
    // -------------------------------------------------------------
    try {
      const res = await fetch(`${baseUrl}/api/products/search?q=ProductXYZ999`);
      const data = await res.json();

      const passed =
        res.status === 200 &&
        data.success === true &&
        Array.isArray(data.data) &&
        data.data.length === 0 &&
        data.pagination?.total === 0;

      results.push({
        name: 'Tìm kiếm sản phẩm không tồn tại ("ProductXYZ999")',
        testCaseId: 'TC17-04',
        passed,
        details: {
          status: res.status,
          total: data.pagination?.total,
          itemsCount: data.data?.length,
          message: data.message,
        },
      });
    } catch (err: any) {
      results.push({
        name: 'Tìm kiếm sản phẩm không tồn tại ("ProductXYZ999")',
        testCaseId: 'TC17-04',
        passed: false,
        error: err.message,
      });
    }

    // -------------------------------------------------------------
    // TC17-05: Xử lý ngoại lệ khi tham số tìm kiếm không hợp lệ
    // Khoảng giá không hợp lệ: minPrice (30M) > maxPrice (10M)
    // -------------------------------------------------------------
    try {
      const res = await fetch(
        `${baseUrl}/api/products/search?minPrice=30000000&maxPrice=10000000`
      );
      const data = await res.json();

      const passed =
        res.status === 400 &&
        data.success === false &&
        data.error &&
        data.error.code === 'INVALID_PRICE_RANGE';

      results.push({
        name: 'Xử lý ngoại lệ khi tham số tìm kiếm không hợp lệ (minPrice > maxPrice)',
        testCaseId: 'TC17-05',
        passed,
        details: {
          status: res.status,
          errorCode: data.error?.code,
          errorMessage: data.error?.message,
        },
      });
    } catch (err: any) {
      results.push({
        name: 'Xử lý ngoại lệ khi tham số tìm kiếm không hợp lệ',
        testCaseId: 'TC17-05',
        passed: false,
        error: err.message,
      });
    }

    // -------------------------------------------------------------
    // Bổ sung: Kiểm tra UC16 - Chi tiết sản phẩm theo ID
    // Mock: SP001 iPhone 16 kem 3 bien the. DB that: lay san pham that
    // dau tien tu API (id so, khong co SP001) va yeu cau >= 1 bien the.
    // -------------------------------------------------------------
    try {
      let detailId = 'SP001';
      let minVariants = 3;
      if (isDatabaseConnected()) {
        const listRes = await fetch(`${baseUrl}/api/products/search?limit=1`);
        const listData = await listRes.json();
        detailId = String(listData.data[0].id);
        minVariants = 1;
      }

      const res = await fetch(`${baseUrl}/api/products/${detailId}`);
      const data = await res.json();

      const passed =
        res.status === 200 &&
        data.success === true &&
        String(data.data?.id) === detailId &&
        (data.data?.variants?.length ?? 0) >= minVariants;

      results.push({
        name: `Lấy chi tiết sản phẩm theo ID (UC16 - ${detailId} kèm ${minVariants}+ biến thể)`,
        testCaseId: 'UC16-01',
        passed,
        details: {
          status: res.status,
          productId: data.data?.id,
          productName: data.data?.name,
          variantCount: data.data?.variants?.length,
        },
      });
    } catch (err: any) {
      results.push({
        name: 'Lấy chi tiết sản phẩm theo ID (UC16)',
        testCaseId: 'UC16-01',
        passed: false,
        error: err.message,
      });
    }

    // -------------------------------------------------------------
    // Bổ sung: Lấy danh mục và thương hiệu phục vụ bộ lọc UI
    // -------------------------------------------------------------
    try {
      const [resCat, resBrand] = await Promise.all([
        fetch(`${baseUrl}/api/categories`),
        fetch(`${baseUrl}/api/brands`),
      ]);
      const dataCat = await resCat.json();
      const dataBrand = await resBrand.json();

      const passed =
        resCat.status === 200 &&
        dataCat.success === true &&
        dataCat.data?.length > 0 &&
        resBrand.status === 200 &&
        dataBrand.success === true &&
        dataBrand.data?.length > 0;

      results.push({
        name: 'Lấy danh sách Danh mục và Thương hiệu cho bộ lọc UI',
        testCaseId: 'FILTER-META',
        passed,
        details: {
          categoriesCount: dataCat.data?.length,
          brandsCount: dataBrand.data?.length,
        },
      });
    } catch (err: any) {
      results.push({
        name: 'Lấy danh sách Danh mục và Thương hiệu cho bộ lọc UI',
        testCaseId: 'FILTER-META',
        passed: false,
        error: err.message,
      });
    }
  } finally {
    await new Promise<void>((resolve) => {
      server.close(() => {
        resolve();
      });
    });
  }

  // -------------------------------------------------------------
  // Tổng kết kết quả kiểm thử
  // -------------------------------------------------------------
  console.log('----------------------------------------------------------------');
  console.log('KẾT QUẢ THỰC THI TEST SUITE:');
  console.log('----------------------------------------------------------------');

  let passedCount = 0;
  for (const r of results) {
    const icon = r.passed ? ' [PASS] ' : ' [FAIL] ';
    console.log(`${icon} [${r.testCaseId}] ${r.name}`);
    if (r.details) {
      console.log('       Chi tiết:', JSON.stringify(r.details));
    }
    if (r.error) {
      console.log('       Lỗi:', r.error);
    }
    if (r.passed) passedCount++;
  }

  console.log('----------------------------------------------------------------');
  const pct = Math.round((passedCount / results.length) * 100);
  console.log(`TỔNG CỘNG: ${passedCount}/${results.length} Test cases đạt yêu cầu (${pct}%).`);
  if (passedCount === results.length) {
    console.log('Tất cả test case đều PASS.');
  } else {
    console.log('CÒN TEST CASE FAIL — xem chi tiết ở trên.');
  }
  console.log('================================================================\n');

  if (passedCount !== results.length) {
    process.exitCode = 1;
  }
}

runTestSuite().catch((err) => {
  console.error('Lỗi thực thi test suite:', err);
  process.exitCode = 1;
});
