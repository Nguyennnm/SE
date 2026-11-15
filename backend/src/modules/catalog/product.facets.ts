export const specKeys = ['ram', 'storage', 'cpu', 'screenSize', 'screenTech', 'os', 'usage', 'refreshRate'] as const;
export type SpecKey = typeof specKeys[number];
export type SpecSelection = Partial<Record<SpecKey, string[]>>;
export interface FacetOption { value: string; label: string; count: number }
export interface FacetGroup { key: SpecKey; label: string; options: FacetOption[] }
export interface FacetRow { id: number; product_id: number; category_code: string; brand: string; ram_gb: number | null; storage_gb: number | null; specifications: Record<string, unknown> }
export function normalize(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[®™]/g, '').trim();
}
export function variantSpecs(row: Pick<FacetRow, 'ram_gb' | 'storage_gb' | 'specifications'>): Partial<Record<SpecKey, string>> {
  const s = row.specifications ?? {};
  const text = (...keys: string[]) => keys.map(k => s[k]).find(v => typeof v === 'string') as string | undefined;
  const result: Partial<Record<SpecKey, string>> = {};
  if (row.ram_gb) result.ram = String(row.ram_gb);
  if (row.storage_gb) result.storage = String(row.storage_gb);
  const screen = text('screen_size');
  const inches = screen?.replace(',', '.').match(/\d+(?:\.\d+)?/);
  if (inches) result.screenSize = String(Number(inches[0]));
  const hz = text('refresh_rate')?.match(/\d+/);
  if (hz) result.refreshRate = String(Number(hz[0]));
  const panel = normalize(text('screen_tech') ?? '');
  if (panel.includes('amoled')) result.screenTech = 'AMOLED';
  else if (panel.includes('oled')) result.screenTech = 'OLED';
  else if (panel.includes('ips')) result.screenTech = 'IPS';
  else if (panel.includes('tft')) result.screenTech = 'TFT';
  else if (panel.includes('lcd')) result.screenTech = 'LCD';
  else if (panel.includes('retina')) result.screenTech = 'Retina';
  const os = normalize(text('os') ?? '');
  if (os.includes('ipad')) result.os = 'iPadOS';
  else if (os.includes('ios')) result.os = 'iOS';
  else if (os.includes('mac')) result.os = 'macOS';
  else if (os.includes('windows')) result.os = 'Windows';
  else if (/android|hyperos|coloros|magicos/.test(os)) result.os = 'Android';
  const cpu = normalize(text('cpu_chipset', 'cpu', 'chipset') ?? '');
  const intel = cpu.match(/(?:intel\s*)?core\s*(ultra\s*)?(i?[3579])/);
  const ryzen = cpu.match(/ryzen\s*(ai|[3579])/);
  const apple = cpu.match(/\b(m[1-9]|a\d{1,2})(?:\b|pro|max|b)/);
  if (intel) result.cpu = `Intel Core ${intel[1] ? 'Ultra ' : ''}${intel[2]}`;
  else if (ryzen) result.cpu = `AMD Ryzen ${ryzen[1].toUpperCase()}`;
  else if (apple && (cpu.includes('apple') || /^m[1-9]/.test(cpu))) result.cpu = `Apple ${apple[1].toUpperCase()}`;
  else if (cpu.includes('snapdragon')) result.cpu = 'Snapdragon';
  else if (/mediatek|helio|dimensity/.test(cpu)) result.cpu = 'MediaTek';
  else if (cpu.includes('exynos')) result.cpu = 'Exynos';
  else if (cpu.includes('celeron')) result.cpu = 'Intel Celeron';
  else if (cpu.includes('pentium')) result.cpu = 'Intel Pentium';
  const usage = text('usage');
  if (usage) result.usage = usage.trim();
  return result;
}
export function matchesSpecs(row: Pick<FacetRow, 'ram_gb' | 'storage_gb' | 'specifications'>, selected: SpecSelection): boolean {
  const values = variantSpecs(row);
  return specKeys.every(key => !selected[key]?.length || selected[key]!.includes(values[key] ?? ''));
}
export function facetGroups(rows: FacetRow[], category?: string): FacetGroup[] {
  const labels: Record<SpecKey, string> = { ram: 'Dung lượng RAM', storage: 'Dung lượng SSD', cpu: category === 'laptop' ? 'Dòng CPU' : 'CPU / Chip xử lý', screenSize: 'Kích thước màn hình', screenTech: 'Công nghệ màn hình', os: 'Hệ điều hành', usage: 'Nhu cầu sử dụng', refreshRate: 'Tần số quét' };
  return specKeys.map(key => {
    const counts = new Map<string, Set<number>>();
    for (const row of rows) {
      const value = variantSpecs(row)[key];
      if (value) { if (!counts.has(value)) counts.set(value, new Set()); counts.get(value)!.add(row.product_id); }
    }
    const label = (v: string) => key === 'storage' ? Number(v) >= 1024 ? `${Number(v) / 1024} TB` : `${v} GB` : key === 'ram' ? `${v} GB` : key === 'screenSize' ? `${v} inch` : key === 'refreshRate' ? `${v} Hz` : v;
    return { key, label: labels[key], options: [...counts].sort(([a], [b]) => ['ram', 'storage', 'screenSize', 'refreshRate'].includes(key) ? Number(a) - Number(b) : a.localeCompare(b)).map(([value, ids]) => ({ value, label: label(value), count: ids.size })) };
  }).filter(group => group.options.length > 0);
}
