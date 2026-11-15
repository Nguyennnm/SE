import type { FacetGroup, SpecKey, SpecSelection } from '../services/productApi';

export function TechnicalFilters({ groups, selected, onChange }: { groups: FacetGroup[]; selected: SpecSelection; onChange: (key: SpecKey, value: string) => void }) {
  return <div className="technical-filters">{groups.map(group => <details className="spec-filter" key={group.key} open={['ram', 'storage', 'cpu'].includes(group.key)}>
    <summary>{group.label}{!!selected[group.key]?.length && <span>{selected[group.key]!.length}</span>}</summary>
    <div className="spec-options">{group.options.map(option => <label className="filter-choice" key={option.value}><input type="checkbox" checked={selected[group.key]?.includes(option.value) ?? false} onChange={() => onChange(group.key, option.value)}/><span>{option.label}</span><small>{option.count}</small></label>)}</div>
  </details>)}</div>;
}
