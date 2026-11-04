/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@react-pdf/renderer'],
    outputFileTracingIncludes: {
      '/api/pdf/event/[id]': [
        './node_modules/pdfkit/js/standard-fonts/**',
        './node_modules/pdfkit/js/data/**',
        './node_modules/@react-pdf/**',
        './node_modules/@fontsource/inter/files/*.woff',
        './node_modules/@fontsource/source-serif-4/files/*.woff',
      ],
      '/api/pdf/event/[id]/dept/[deptId]': [
        './node_modules/pdfkit/js/standard-fonts/**',
        './node_modules/pdfkit/js/data/**',
        './node_modules/@react-pdf/**',
        './node_modules/@fontsource/inter/files/*.woff',
        './node_modules/@fontsource/source-serif-4/files/*.woff',
      ],
      '/api/pdf/event/[id]/depts': [
        './node_modules/pdfkit/js/standard-fonts/**',
        './node_modules/pdfkit/js/data/**',
        './node_modules/@react-pdf/**',
        './node_modules/@fontsource/inter/files/*.woff',
        './node_modules/@fontsource/source-serif-4/files/*.woff',
      ],
      '/api/pdf/run-sheet': [
        './node_modules/pdfkit/js/standard-fonts/**',
        './node_modules/pdfkit/js/data/**',
        './node_modules/@react-pdf/**',
        './node_modules/@fontsource/inter/files/*.woff',
        './node_modules/@fontsource/source-serif-4/files/*.woff',
      ],
    },
  },
}

export default nextConfig
