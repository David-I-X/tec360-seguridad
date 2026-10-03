import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/', '/configuracion/', '/tecnicos/', '/auth/'],
    },
    sitemap: 'https://tec-360.tech/sitemap.xml',
  }
}
