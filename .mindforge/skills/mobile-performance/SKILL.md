---
name: mobile-performance
version: 1.0.0
min_mindforge_version: 10.4.0
status: stable
triggers: mobile app performance, app startup optimization, mobile memory management, battery usage optimization, frame rate optimization, mobile rendering performance, mobile network optimization, app size reduction, mobile profiling, jank reduction, mobile CPU optimization, smooth scrolling mobile
---

# Skill — Mobile Performance Optimization

## When this skill activates
This skill activates when optimizing mobile app performance, including startup time, memory usage, battery consumption, frame rate, network efficiency, or app size reduction.

## Mandatory actions when this skill is active

### Before writing any code
1. Establish performance baselines using profiling tools (Xcode Instruments, Android Studio Profiler, React DevTools)
2. Identify performance targets: startup time (<2s to interactive), frame rate (60fps), memory budget, battery impact
3. Profile existing app to find bottlenecks — CPU hotspots, memory leaks, excessive network calls, unnecessary renders
4. Determine which optimizations provide highest impact for lowest effort (focus on hot paths first)

### During implementation
- Defer non-critical initialization to after app becomes interactive (lazy loading, background threads)
- Implement virtualized lists for large datasets (RecyclerView, UICollectionView, FlatList with proper optimization props)
- Optimize images: compress, use appropriate formats (WebP, HEIF), implement progressive loading and caching
- Minimize JavaScript bridge traffic in hybrid apps — batch calls, use native implementations for performance-critical code
- Implement proper pagination and infinite scroll to avoid loading excessive data
- Use release builds for performance testing — debug builds have significant overhead
- Profile memory allocations, fix retain cycles, implement proper cleanup in component unmount/dispose

### After implementation
- Measure startup time from app launch to first interactive frame using platform tools
- Profile with production-like data volume and network conditions (throttle to 3G/4G)
- Test on low-end devices (not just flagship phones) to catch performance issues
- Monitor frame rate during animations, scrolling, and transitions using on-device FPS counters
- Use battery profiling tools to identify energy-intensive operations (location, background processing, wake locks)

## Self-check before task completion
- [ ] App startup time meets target (<2s to interactive on mid-range device)
- [ ] Frame rate stays at 60fps during scrolling and animations (no jank or dropped frames)
- [ ] Memory usage is stable with no leaks (test with extended usage, multiple navigation cycles)
- [ ] App size is minimized (proper ProGuard/R8, asset optimization, code splitting)
- [ ] Battery impact is acceptable (no excessive background processing, location polling, or wake locks)
- [ ] Network usage is optimized (request batching, proper caching, compression, avoid polling)
