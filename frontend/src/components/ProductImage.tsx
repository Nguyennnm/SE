import { useState } from 'react';
import { ProductArt } from './ProductArt';

export function ProductImage({ name, src, kind, color }: { name: string; src?: string; kind: string; color: string }) {
  const [failedUrl, setFailedUrl] = useState<string>();
  return src && failedUrl !== src
    ? <img className="catalog-image" src={src} alt={name} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailedUrl(src)}/>
    : <ProductArt name={name} kind={kind} color={color}/>;
}
