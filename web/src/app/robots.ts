import type { MetadataRoute } from 'next';
export default function robots(): MetadataRoute.Robots { return { rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/api/auth', '/api/admin', '/favorites'] }, sitemap: 'https://ohtautau.com/sitemap.xml' }; }
