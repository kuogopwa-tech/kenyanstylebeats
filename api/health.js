// api/auth/health.js
export default async function handler(req, res) {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'auth-api',
    endpoints: ['/api/auth/register', '/api/auth/login', '/api/auth/health']
  });
}