import { MetadataRoute } from 'next';

const configuredSiteUrl = process.env.NEXT_PUBLIC_APP_URL;
const isLocalSiteUrl =
  configuredSiteUrl?.includes('localhost') || configuredSiteUrl?.includes('127.0.0.1');
const siteUrl =
  process.env.NODE_ENV === 'production' && isLocalSiteUrl
    ? 'https://co-op.software'
    : configuredSiteUrl || 'https://co-op.software';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${siteUrl}/download`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${siteUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${siteUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${siteUrl}/security`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${siteUrl}/cookies`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.2,
    },
  ];
}
