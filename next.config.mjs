/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@react-pdf/renderer'],
    outputFileTracingIncludes: {
      '/api/pdf/event/[id]': [
        './node_modules/pdfkit/js/standard-fonts/**',
        './node_modules/pdfkit/js/data/**',
        './node_modules/@react-pdf/**',
      ],
      '/api/pdf/event/[id]/dept/[deptId]': [
        './node_modules/pdfkit/js/standard-fonts/**',
        './node_modules/pdfkit/js/data/**',
        './node_modules/@react-pdf/**',
      ],
      '/api/pdf/run-sheet': [
        './node_modules/pdfkit/js/standard-fonts/**',
        './node_modules/pdfkit/js/data/**',
        './node_modules/@react-pdf/**',
      ],
    },
  },
}

export default nextConfig
