const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const { checkDockerServices } = require('../utils/docker');
const { downloadVideo } = require('../services/videoDownloader');
const { extractAudioSegment, mergeAudioFiles } = require('../services/audioProcessor');
const { scheduleCleanup } = require('../services/cleanup');

const router = express.Router();

// Directories
const MEDIA_DIR = path.join(__dirname, '../../media');
const CACHE_DIR = path.join(MEDIA_DIR, '.youtube_cache');
const TEMP_DIR = path.join(MEDIA_DIR, '.temp_segments');
const OUTPUT_DIR = path.join(MEDIA_DIR, 'output');

// Ensure directories exist
async function ensureDirectories() {
  await fs.ensureDir(CACHE_DIR);
  await fs.ensureDir(TEMP_DIR);
  await fs.ensureDir(OUTPUT_DIR);
}

/**
 * POST /api/generate
 * Generates audio from YouTube video segments
 */
router.post('/generate', async (req, res) => {
  const { projectName, segments } = req.body;

  if (!segments || !Array.isArray(segments) || segments.length === 0) {
    return res.status(400).json({ error: 'No segments provided' });
  }

  console.log(`\n🎵 Starting generation for project: ${projectName}`);
  console.log(`📊 Segments: ${segments.length}`);

  try {
    // 1. Check Docker services
    await checkDockerServices();
    console.log('✅ Docker services are running');

    // 2. Ensure directories
    await ensureDirectories();
    console.log('✅ Directories ready');

    // 3. Download videos
    console.log('\n📥 Downloading videos...');
    const downloadedVideos = [];

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      console.log(`\n[${i + 1}/${segments.length}] Processing: ${segment.url}`);

      const videoPath = await downloadVideo(
        segment.url,
        CACHE_DIR,
        (msg) => console.log(`  ${msg}`)
      );

      downloadedVideos.push({
        videoPath,
        startTime: segment.startTime,
        endTime: segment.endTime,
      });
    }

    // 4. Extract audio segments
    console.log('\n🎬 Extracting audio segments...');
    const audioSegments = [];

    for (let i = 0; i < downloadedVideos.length; i++) {
      const { videoPath, startTime, endTime } = downloadedVideos[i];
      const audioFileName = `audio_segment_${i + 1}.m4a`;
      const audioPath = path.join(TEMP_DIR, audioFileName);

      console.log(`\n[${i + 1}/${downloadedVideos.length}] Extracting audio...`);

      await extractAudioSegment(
        videoPath,
        startTime,
        endTime,
        audioPath,
        (msg) => console.log(`  ${msg}`)
      );

      audioSegments.push(audioPath);
    }

    // 5. Merge audio segments
    console.log('\n🔗 Merging audio segments...');
    const timestamp = Date.now();
    const outputFileName = `mashup_${timestamp}.m4a`;
    const outputPath = path.join(OUTPUT_DIR, outputFileName);

    await mergeAudioFiles(
      audioSegments,
      outputPath,
      TEMP_DIR,
      (msg) => console.log(`  ${msg}`)
    );

    // 6. Clean up temp files
    console.log('\n🧹 Cleaning up temporary files...');
    await fs.emptyDir(TEMP_DIR);
    console.log('✅ Temporary files cleaned');

    // 7. Schedule output file cleanup (24 hours)
    scheduleCleanup(outputPath, 24 * 60 * 60 * 1000);
    console.log(`⏰ Scheduled cleanup for ${outputFileName} in 24 hours`);

    // 8. Send file
    console.log('\n✨ Generation complete! Sending file...\n');

    res.download(outputPath, outputFileName, (err) => {
      if (err) {
        console.error('Error sending file:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Failed to send file' });
        }
      }
    });

  } catch (error) {
    console.error('\n❌ Generation failed:', error.message);
    console.error(error.stack);

    // Clean up on error
    try {
      await fs.emptyDir(TEMP_DIR);
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError.message);
    }

    res.status(500).json({
      error: error.message || 'Generation failed',
      details: error.stack,
    });
  }
});

/**
 * GET /api/status
 * Check API and Docker status
 */
router.get('/status', async (req, res) => {
  try {
    await checkDockerServices();
    res.json({
      status: 'ok',
      docker: 'running',
      message: 'All systems operational',
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      docker: 'not running',
      message: error.message,
    });
  }
});

module.exports = router;
