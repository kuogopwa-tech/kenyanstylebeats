// api/health.js - ES Module format
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  res.status(200).json({
    status: 'OK',
    message: 'API is working!',
    timestamp: new Date().toISOString()
  });
}