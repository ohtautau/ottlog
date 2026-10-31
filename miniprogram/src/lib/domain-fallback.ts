/** The stored legacy name remains readable; IDs and histories never change. */
export const OTHER_DOMAIN_NAME = '其它';
export const isFallbackDomainName = (name: string) => name.trim() === '未分类' || name.trim() === OTHER_DOMAIN_NAME;
export const domainDisplayName = (name: string) => isFallbackDomainName(name) ? OTHER_DOMAIN_NAME : name;
export function findFallbackDomain<T extends { name: string }>(domains: readonly T[]): T | undefined {
  // Prefer the old system entry if an archive also contains a custom “其它”.
  return domains.find(domain => domain.name.trim() === '未分类') ?? domains.find(domain => domain.name.trim() === OTHER_DOMAIN_NAME);
}
