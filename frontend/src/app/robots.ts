import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/', '/configuracion/'],
    },
    sitemap: 'https://tec-360.tech/sitemap.xml',
  }
}
