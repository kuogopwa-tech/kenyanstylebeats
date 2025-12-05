// SIMPLE TEST VERSION - api/beats/index.js
export default async function handler(req, res) {
  console.log('✅ /api/beats endpoint called');
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
  
  // Handle OPTIONS request (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow GET method for testing
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }
  
  try {
    // Return test data
    const testBeats = [
      {
        _id: '1',
        title: 'Nairobi Nights',
        series: 'Afro Fusion',
        price: 1500,
        genre: 'Afrobeat',
        fileType: 'Audio',
        uploadedBy: { name: 'Test Producer', email: 'test@example.com' },
        plays: 45,
        downloads: 12,
        createdAt: new Date().toISOString()
      },
      {
        _id: '2',
        title: 'Savannah Groove',
        series: 'African Rhythms',
        price: 1200,
        genre: 'Bongo Flava',
        fileType: 'Style',
        uploadedBy: { name: 'Demo Producer', email: 'demo@example.com' },
        plays: 20,
        downloads: 8,
        createdAt: new Date().toISOString()
      },
      {
        _id: '3',
        title: 'City Lights',
        series: 'Urban Beats',
        price: 1800,
        genre: 'Hip Hop',
        fileType: 'Audio',
        uploadedBy: { name: 'Urban Creator', email: 'urban@example.com' },
        plays: 32,
        downloads: 15,
        createdAt: new Date().toISOString()
      }
    ];
    
    console.log(`✅ Returning ${testBeats.length} test beats`);
    
    return res.status(200).json({
      success: true,
      beats: testBeats,
      count: testBeats.length,
      total: testBeats.length,
      page: 1,
      pages: 1,
      message: 'Beats loaded successfully from Vercel'
    });
    
  } catch (error) {
    console.error('❌ Error in /api/beats:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}