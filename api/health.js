// api/health.js - SIMPLE VERSION
module.exports = (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  res.status(200).json({ 
    status: 'OK',
    message: 'API is working!',
    timestamp: new Date().toISOString(),
    path: req.url
  });
};