// Utility function to get the base URL for API calls
// In production, this should be set via NEXT_PUBLIC_APP_URL
// In development, it defaults to localhost:3000

export function getApiUrl(path: string = '') {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000')
  
  return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`
}




