// api/health.js
export default async function handler(req, res) {
  return res.status(200).json({
    success: true,
    message: '✅ EMPIRE BEATSTORE API is running',
    timestamp: new Date().toISOString()
  });
}