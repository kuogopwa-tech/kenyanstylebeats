// scripts/fix-fileids.js
const mongoose = require('mongoose');
const Beat = require('../models/Beat');
require('dotenv').config();

async function fixFileIds() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/your-database');
    console.log('✅ Connected to MongoDB');
    
    // Get all beats
    const beats = await Beat.find({});
    console.log(`📊 Found ${beats.length} beats to check`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (const beat of beats) {
      try {
        console.log(`\n🔍 Checking beat: ${beat.title || 'Untitled'} (${beat._id})`);
        
        // Check current fileId type
        if (!beat.fileId) {
          console.log('❌ No fileId - skipping');
          skippedCount++;
          continue;
        }
        
        const originalFileId = beat.fileId;
        const originalType = typeof originalFileId;
        const isString = originalType === 'string';
        const isObjectId = originalFileId instanceof mongoose.Types.ObjectId;
        
        console.log(`📋 Current fileId: ${originalFileId}`);
        console.log(`📋 Type: ${originalType}, isString: ${isString}, isObjectId: ${isObjectId}`);
        
        // If it's already ObjectId, skip
        if (isObjectId) {
          console.log('✅ Already ObjectId - skipping');
          skippedCount++;
          continue;
        }
        
        // If it's a string, try to convert
        if (isString) {
          // Check if it's "undefined" or empty
          if (originalFileId === 'undefined' || originalFileId === 'null' || originalFileId === '') {
            console.log('⚠️  Invalid fileId string - skipping');
            skippedCount++;
            continue;
          }
          
          // Check if valid ObjectId string
          if (mongoose.Types.ObjectId.isValid(originalFileId)) {
            // Convert to ObjectId
            beat.fileId = new mongoose.Types.ObjectId(originalFileId);
            await beat.save();
            updatedCount++;
            console.log(`✅ Converted string to ObjectId: ${beat.fileId}`);
          } else {
            console.log('❌ Invalid ObjectId format - skipping');
            skippedCount++;
          }
        } else {
          console.log(`⚠️  Unknown type (${originalType}) - skipping`);
          skippedCount++;
        }
        
      } catch (error) {
        console.error(`🔥 Error processing beat ${beat._id}:`, error.message);
        errorCount++;
      }
    }
    
    console.log('\n📊 ===== MIGRATION SUMMARY =====');
    console.log(`✅ Updated: ${updatedCount} beats`);
    console.log(`⏭️  Skipped: ${skippedCount} beats`);
    console.log(`❌ Errors: ${errorCount} beats`);
    console.log(`📈 Total: ${beats.length} beats`);
    
    // Verify the fixes
    console.log('\n🔍 Verifying fixes...');
    const sampleBeats = await Beat.find({}).limit(5).select('title fileId');
    console.log('Sample beats after fix:');
    sampleBeats.forEach(b => {
      console.log(`- ${b.title}: ${b.fileId} (${b.fileId?.constructor?.name})`);
    });
    
  } catch (error) {
    console.error('🔥 Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the migration
fixFileIds();