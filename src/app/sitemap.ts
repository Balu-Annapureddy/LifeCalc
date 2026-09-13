import { MetadataRoute } from 'next';
import { registry } from '@/engine/registry';
import { CATEGORIES } from '@/engine/categories';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://lifecalc.in';
  const now = new Date();

  // 1. Static Pages
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/search`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
  ];

  // 2. Category Pages
  const categoryRoutes: MetadataRoute.Sitemap = Object.keys(CATEGORIES).map(cat => ({
    url: `${baseUrl}/calculators/${cat}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  // 3. Calculator Detail Pages
  const calculatorRoutes: MetadataRoute.Sitemap = registry.getAll().map(calc => ({
    url: `${baseUrl}/calculators/${calc.category}/${calc.slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.9,
  }));

  return [...staticRoutes, ...categoryRoutes, ...calculatorRoutes];
}
