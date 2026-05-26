---
name: media-streaming
version: 1.0.0
min_mindforge_version: 10.2.0
status: stable
triggers: media streaming architecture, video transcoding pipeline, adaptive bitrate streaming, DRM implementation, live streaming system, audio streaming, media delivery network, HLS DASH streaming, media processing pipeline, content protection, video on demand, streaming infrastructure
compose: cdn-optimization
---

# Skill — Media Streaming

## When this skill activates
This skill activates when building video/audio streaming platforms, transcoding pipelines, adaptive bitrate delivery (HLS/DASH), DRM content protection, live streaming systems, CDN integration, or video-on-demand (VOD) architectures.

## Mandatory actions when this skill is active

### Before writing any code
1. Design transcoding pipeline: ingest source video (MP4, MOV, AVI) → extract metadata (resolution, bitrate, codec, duration) → transcode to multiple renditions (4K/1080p/720p/480p/360p), audio tracks (AAC 128kbps stereo), generate HLS/DASH manifests (.m3u8/.mpd), output to object storage (S3), with job queue (SQS) and status webhooks
2. Model adaptive bitrate delivery: client requests master playlist (m3u8) → server returns variant streams (bitrate ladder: 8 Mbps, 5 Mbps, 2.5 Mbps, 1 Mbps, 500 kbps) → client measures bandwidth → switches to appropriate quality → seamless transition without buffering
3. Map DRM content protection workflow: encrypt video segments (AES-128 or CBCS), generate license keys (Widevine, FairPlay, PlayReady), store keys in key server, client requests license → key server validates entitlement (subscription active, geo-restrictions) → returns decryption key → client decrypts and plays

### During implementation
- Implement transcoding with FFmpeg or cloud services (AWS MediaConvert, Azure Media Services): configure encoding ladder (GOP size 2s, H.264 High profile, AAC audio), generate thumbnails (every 10s), extract VTT subtitles, optimize for web (moov atom at start for MP4), enable hardware acceleration (GPU encoding for faster processing)
- Build HLS/DASH streaming with segmentation: split video into 6-second segments (TS for HLS, MP4 for DASH), generate manifest with variant streams (EXT-X-STREAM-INF for bitrate/resolution), enable discontinuity tags for ad insertion, support live DVR (sliding window of last 2 hours)
- Design CDN delivery with edge caching: upload to origin (S3 bucket), configure CloudFront distribution, set TTL policies (video segments: 7 days, manifests: 60s for VOD, 5s for live), enable signed URLs for protected content (expire after 2 hours), use geo-restriction for licensing compliance
- Implement DRM integration: encrypt video during transcoding (specify key ID), integrate with key server (AWS SPEKE, Axinom, BuyDRM), client-side DRM initialization (Shaka Player for DASH, hls.js with EME for HLS), handle license renewal (for long-form content >2 hours), support offline downloads with persistent licenses
- Build player analytics: track playback events (video_start, video_pause, video_complete, error, buffering), measure quality metrics (startup time, rebuffering ratio, bitrate distribution), aggregate by user/video/device, identify issues (high rebuffering on specific ISP, low bitrate selection on mobile)

### After implementation
- Validate streaming quality: measure startup latency (<2s for 90th percentile), rebuffering ratio (<1% of playback time), bitrate adaptation responsiveness (switch within 10s of bandwidth change), A/V sync (<200ms drift), and seek accuracy (land within 500ms of target time)
- Test DRM enforcement: attempt playback without valid license (should fail), expired license (should prompt re-authentication), screen recording detection (Widevine L1 blocks HDMI capture on Android), device limit enforcement (max 3 concurrent streams per account)
- Execute load testing for live streams: simulate 10K+ concurrent viewers, measure origin-to-edge latency (should be <3s for live), segment availability (all segments delivered before next segment starts), CDN cache hit ratio (>95% after warm-up), and origin load (offloaded to CDN)

## Self-check before task completion
- [ ] Transcoding pipeline functional: ingest source video, transcode to multiple renditions (4K to 360p), generate HLS/DASH manifests, output to object storage
- [ ] Adaptive bitrate streaming: bitrate ladder defined (8 Mbps to 500 kbps), client switches based on bandwidth, seamless quality transitions
- [ ] DRM content protection: video encrypted (AES-128/CBCS), license server integrated (Widevine/FairPlay/PlayReady), entitlement validation before key delivery
- [ ] CDN delivery optimized: edge caching configured, TTL policies set (long for segments, short for manifests), signed URLs for protected content
- [ ] Player analytics tracked: playback events (start, pause, complete, error), quality metrics (startup time, rebuffering, bitrate), aggregated reports
- [ ] Live streaming supported: real-time segmentation (6s segments), sliding window DVR (last 2 hours), low latency (<3s origin-to-edge)
- [ ] Quality targets met: startup <2s, rebuffering <1%, bitrate adaptation <10s, A/V sync <200ms, seek accuracy <500ms
