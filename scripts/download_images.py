"""Download the images recorded in data/image_manifest.csv by Phong Vũ SKU."""
import argparse
import csv
import io
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

from PIL import Image, ImageOps, UnidentifiedImageError

ROOT = Path(__file__).resolve().parents[1]
MAX_IMAGE_BYTES = 8 * 1024 * 1024
IMAGE_HOST = 'lh3.googleusercontent.com'


def download(url: str, destination: Path) -> None:
    parsed = urlsplit(url)
    if parsed.scheme != 'https' or parsed.hostname != IMAGE_HOST:
        raise ValueError('URL ảnh nằm ngoài CDN được ghi nhận')
    request = Request(url, headers={
        'Accept': 'image/webp,image/jpeg,image/png,image/*',
        'User-Agent': 'Smart-Electronics-PA4-Image-Download/1.0',
    })
    with urlopen(request, timeout=15) as response:
        if urlsplit(response.geturl()).hostname != IMAGE_HOST:
            raise ValueError('CDN chuyển hướng sang máy chủ khác')
        if response.headers.get_content_maintype() != 'image':
            raise ValueError('CDN không trả về ảnh')
        data = response.read(MAX_IMAGE_BYTES + 1)
    if len(data) > MAX_IMAGE_BYTES:
        raise ValueError('Ảnh vượt quá giới hạn 8 MiB')
    with Image.open(io.BytesIO(data)) as image:
        image = ImageOps.exif_transpose(image)
        image.thumbnail((1400, 1400))
        temporary = destination.with_suffix('.tmp')
        destination.parent.mkdir(parents=True, exist_ok=True)
        try:
            image.save(temporary, format='WEBP', quality=88)
            temporary.replace(destination)
        finally:
            temporary.unlink(missing_ok=True)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--scope', choices=['2026', 'all'], default='2026')
    parser.add_argument('--category', choices=['laptop', 'phone', 'tablet'])
    parser.add_argument('--sku', help='Chỉ tải một SKU cụ thể, kết hợp với --scope all nếu cần')
    parser.add_argument('--output', type=Path, default=ROOT / 'frontend/public/images/products/phongvu')
    args = parser.parse_args()
    with (ROOT / 'data/image_manifest.csv').open(encoding='utf-8-sig', newline='') as file:
        rows = [
            row for row in csv.DictReader(file)
            if (args.scope == 'all' or row['verified_release_year'] == '2026')
            and (args.category is None or row['category'] == args.category)
            and (args.sku is None or row['seller_sku'] == args.sku)
        ]
    if not rows:
        parser.error('Không có SKU phù hợp với các bộ lọc')
    done = skipped = failed = 0
    for row in rows:
        sku = row['seller_sku']
        destination = args.output / row['category'] / f'{sku}.webp'
        if destination.is_file():
            try:
                with Image.open(destination) as image:
                    image.verify()
                skipped += 1
                continue
            except (UnidentifiedImageError, OSError):
                pass
        try:
            download(row['image_url'], destination)
            done += 1
        except HTTPError as error:
            failed += 1
            print(f'{sku}: HTTP {error.code}', flush=True)
            if error.code in (403, 429):
                print('CDN từ chối hoặc giới hạn tải. Dừng lượt này. Có thể chạy lại sau.', flush=True)
                break
        except (URLError, OSError, ValueError) as error:
            failed += 1
            print(f'{sku}: {error}', flush=True)
        time.sleep(0.25)
    print(f'Tải mới: {done} | Có sẵn: {skipped} | Lỗi: {failed} | Tổng cần có: {len(rows)}')
    return 1 if done + skipped < len(rows) else 0


if __name__ == '__main__':
    raise SystemExit(main())
