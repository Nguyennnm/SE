export const specKeys = ['ram', 'storage', 'cpu', 'screenSize', 'screenTech', 'os', 'usage', 'refreshRate'] as const;
export type SpecKey = typeof specKeys[number];
export type SpecSelection = Partial<Record<SpecKey, string[]>>;
export interface FacetOption { value: string; label: string; count: number }
export interface FacetGroup {
  key: SpecKey; label: string; options: FacetOption[];
  coverage: { totalProducts: number; knownProducts: number; missingProducts: number; partialProducts: number; totalVariants: number; missingVariants: number };
}
export interface FacetRow { id: number; product_id: number; category_code: string; brand: string; ram_gb: number | null; storage_gb: number | null; specifications: Record<string, unknown> }
export function normalize(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[®™]/g, '').trim();
}
export function variantSpecs(row: Pick<FacetRow, 'ram_gb' | 'storage_gb' | 'specifications'>): Partial<Record<SpecKey, string>> {
  const s = row.specifications ?? {};
  const text = (...keys: string[]) => keys.map(k => s[k]).find(v => typeof v === 'string' && v.trim()) as string | undefined;
  const result: Partial<Record<SpecKey, string>> = {};
  // Only explicit capacities/units are accepted; never infer from model names.
  const capacity = (value?: string) => {
    const match = value?.match(/^\s*(\d+(?:[.,]\d+)?)\s*(GB|TB)\b/i);
    return match ? Number(match[1].replace(',', '.')) * (match[2].toUpperCase() === 'TB' ? 1024 : 1) : undefined;
  };
  const ram = row.ram_gb ?? capacity(text('ram'));
  const storage = row.storage_gb ?? capacity(text('storage', 'ssd'));
  if (ram && Number.isFinite(ram) && ram > 0) result.ram = String(ram);
  if (storage && Number.isFinite(storage) && storage > 0) result.storage = String(storage);
  const screen = text('screen_size');
  const inches = screen?.replace(',', '.').match(/\d+(?:\.\d+)?/);
  const explicitDiagonal = inches ?? text('display', 'screen')?.replace(',', '.').match(/(\d+(?:\.\d+)?)\s*(?:"|inch\b)/i)?.slice(1);
  if (explicitDiagonal && Number(explicitDiagonal[0]) >= 3 && Number(explicitDiagonal[0]) <= 32) result.screenSize = String(Number(explicitDiagonal[0]));
  const explicitRefresh = text('refresh_rate');
  const rateText = explicitRefresh ?? text('display', 'screen') ?? '';
  const rates = [...new Set([...rateText.matchAll(/(\d+)\s*Hz\b/gi)].map(match => Number(match[1])))];
  const ambiguousRange = /\d+\s*[-–—/]\s*\d+\s*Hz\b/i.test(rateText);
  // Multiple rates are ambiguous; do not turn an adaptive range into a fixed rate.
  if (!ambiguousRange && rates.length === 1 && rates[0] > 0) result.refreshRate = String(rates[0]);
  for (const source of [text('screen_tech'), text('display', 'screen')]) {
    const panel = normalize(source ?? '');
    if (panel.includes('amoled')) result.screenTech = 'AMOLED';
    else if (panel.includes('oled')) result.screenTech = 'OLED';
    else if (panel.includes('ips')) result.screenTech = 'IPS';
    else if (panel.includes('tft')) result.screenTech = 'TFT';
    else if (panel.includes('lcd')) result.screenTech = 'LCD';
    else if (panel.includes('retina')) result.screenTech = 'Retina';
    if (result.screenTech) break;
  }
  const os = normalize(text('os') ?? '');
  if (os.includes('ipad')) result.os = 'iPadOS';
  else if (os.includes('ios')) result.os = 'iOS';
  else if (os.includes('mac')) result.os = 'macOS';
  else if (os.includes('windows')) result.os = 'Windows';
  else if (/android|hyperos|coloros|magicos/.test(os)) result.os = 'Android';
  const cpu = normalize(text('cpu_chipset', 'cpu', 'chipset') ?? '');
  const intel = cpu.match(/(?:intel\s*)?core\s*(ultra\s*)?([ix]?[3579])/);
  const ryzen = cpu.match(/ryzen\s*(ai|[3579])/);
  const apple = cpu.match(/\b(m[1-9]|a\d{1,2})(?:\b|pro|max|b)/);
  if (intel) result.cpu = `Intel Core ${intel[1] ? 'Ultra ' : ''}${intel[2].startsWith('x') ? intel[2].toUpperCase() : intel[2]}`;
  else if (ryzen) result.cpu = `AMD Ryzen ${ryzen[1].toUpperCase()}`;
  else if (apple && (cpu.includes('apple') || /^m[1-9]/.test(cpu))) result.cpu = `Apple ${apple[1].toUpperCase()}`;
  else if (cpu.includes('snapdragon')) result.cpu = 'Snapdragon';
  else if (/mediatek|helio|dimensity/.test(cpu)) result.cpu = 'MediaTek';
  else if (cpu.includes('exynos')) result.cpu = 'Exynos';
  else if (cpu.includes('celeron')) result.cpu = 'Intel Celeron';
  else if (cpu.includes('pentium')) result.cpu = 'Intel Pentium';
  else if (cpu.includes('unisoc')) result.cpu = 'Unisoc';
  const usage = text('usage');
  if (usage) result.usage = usage.trim();
  return result;
}
export function matchesSpecs(row: Pick<FacetRow, 'ram_gb' | 'storage_gb' | 'specifications'>, selected: SpecSelection): boolean {
  const values = variantSpecs(row);
  return specKeys.every(key => !selected[key]?.length || selected[key]!.includes(values[key] ?? ''));
}
export function facetGroups(rows: FacetRow[], category?: string, groupBy: 'product' | 'variant' = 'product'): FacetGroup[] {
  const requestedCategory = normalize(category ?? '');
  const onlyCategory = new Set(rows.map(row => row.category_code));
  const code = ['laptop', 'phone', 'tablet'].includes(requestedCategory) ? requestedCategory : onlyCategory.size === 1 ? rows[0].category_code : undefined;
  const storageLabel = code === 'laptop' ? 'Dung lượng SSD' : code === 'phone' || code === 'tablet' ? 'Bộ nhớ trong' : 'Dung lượng lưu trữ';
  const labels: Record<SpecKey, string> = { ram: 'Dung lượng RAM', storage: storageLabel, cpu: code === 'laptop' ? 'Dòng CPU' : 'CPU / Chip xử lý', screenSize: 'Kích thước màn hình', screenTech: 'Công nghệ màn hình', os: 'Hệ điều hành', usage: 'Nhu cầu sử dụng', refreshRate: 'Tần số quét' };
  const parsed = rows.map(row => ({ row, values: variantSpecs(row) }));
  const totalProducts = new Set(rows.map(row => row.product_id)).size;
  return specKeys.map(key => {
    const counts = new Map<string, Set<number>>();
    const known = new Set<number>();
    const missing = new Set<number>();
    let missingVariants = 0;
    for (const { row, values } of parsed) {
      const value = values[key];
      if (value) known.add(row.product_id);
      else { missing.add(row.product_id); missingVariants++; }
      if (value) { if (!counts.has(value)) counts.set(value, new Set()); counts.get(value)!.add(groupBy === 'variant' ? row.id : row.product_id); }
    }
    const label = (v: string) => key === 'storage' ? Number(v) >= 1024 ? `${Number(v) / 1024} TB` : `${v} GB` : key === 'ram' ? `${v} GB` : key === 'screenSize' ? `${v} inch` : key === 'refreshRate' ? `${v} Hz` : v;
    return { key, label: labels[key], coverage: { totalProducts, knownProducts: known.size, missingProducts: totalProducts - known.size, partialProducts: [...known].filter(id => missing.has(id)).length, totalVariants: rows.length, missingVariants }, options: [...counts].sort(([a], [b]) => ['ram', 'storage', 'screenSize', 'refreshRate'].includes(key) ? Number(a) - Number(b) : a.localeCompare(b)).map(([value, ids]) => ({ value, label: label(value), count: ids.size })) };
  }).filter(group => group.options.length > 0);
}
