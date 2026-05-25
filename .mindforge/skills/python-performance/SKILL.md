---
name: python-performance
version: 1.0.0
min_mindforge_version: 10.0.6
status: stable
triggers: python performance, cProfile, line profiler, memory profiler, asyncio optimization, multiprocessing pool, vectorization, python bottleneck, python profiling, python memory leak, generator optimization, python concurrency
compose: performance
---

# Skill — Python Performance

## When this skill activates
Any task involving Python runtime performance: identifying bottlenecks, reducing
execution time, fixing memory leaks, optimizing async code, parallelizing workloads,
or replacing slow Python loops with vectorized operations.

## Mandatory actions when this skill is active

### Before writing any code
1. **Establish a baseline measurement.** Never optimize without numbers. Identify:
   - What is slow? (wall time, CPU time, memory growth, I/O wait)
   - How slow? (current measurement with units)
   - What is the target? (acceptable latency/throughput/memory)
2. Select the correct profiling tool for the problem:
   | Symptom | Tool | Command |
   |---|---|---|
   | "It's slow" (general) | cProfile + snakeviz | `python -m cProfile -o prof.out script.py && snakeviz prof.out` |
   | "This function is slow" (line-level) | line_profiler | `kernprof -l -v script.py` (decorate with `@profile`) |
   | "Memory keeps growing" | memory_profiler | `python -m memory_profiler script.py` (decorate with `@profile`) |
   | "Memory leaks in long-running process" | tracemalloc | `tracemalloc.start(); snapshot = tracemalloc.take_snapshot()` |
   | "I/O bound" | py-spy (sampling) | `py-spy top --pid <PID>` |
   | "GIL contention" | py-spy | `py-spy record --native -o profile.svg --pid <PID>` |
3. Do NOT guess. Profile first, then optimize the hottest path.

### During implementation

#### Profiling Workflow
```python
# Quick cProfile workflow
import cProfile
import pstats

profiler = cProfile.Profile()
profiler.enable()
# ... code under test ...
profiler.disable()
stats = pstats.Stats(profiler).sort_stats("cumulative")
stats.print_stats(20)  # Top 20 by cumulative time
```

#### Asyncio Optimization
- Use `asyncio.TaskGroup` (Python 3.11+) over `asyncio.gather` for structured concurrency:
  ```python
  async with asyncio.TaskGroup() as tg:
      task1 = tg.create_task(fetch_user(user_id))
      task2 = tg.create_task(fetch_orders(user_id))
  # Both complete or both cancel on error
  ```
- Never block the event loop with synchronous I/O. Offload with `loop.run_in_executor`:
  ```python
  result = await loop.run_in_executor(None, blocking_io_function, arg)
  ```
- Avoid `await` in tight loops. Batch operations:
  ```python
  # Bad: sequential awaits
  for item in items:
      await process(item)
  # Good: concurrent with bounded concurrency
  sem = asyncio.Semaphore(10)
  async def bounded(item):
      async with sem:
          return await process(item)
  results = await asyncio.gather(*(bounded(i) for i in items))
  ```
- Use `asyncio.Queue` for producer-consumer patterns instead of polling.
- Set appropriate timeouts on all network calls: `async with asyncio.timeout(5.0)`.

#### Multiprocessing
- Use `ProcessPoolExecutor` for CPU-bound work (bypasses GIL):
  ```python
  from concurrent.futures import ProcessPoolExecutor
  with ProcessPoolExecutor(max_workers=os.cpu_count()) as pool:
      results = list(pool.map(cpu_heavy_function, data_chunks))
  ```
- Use `multiprocessing.shared_memory` for large data to avoid serialization overhead:
  ```python
  from multiprocessing import shared_memory
  shm = shared_memory.SharedMemory(create=True, size=array.nbytes)
  shared_array = np.ndarray(array.shape, dtype=array.dtype, buffer=shm.buf)
  ```
- Prefer `Pool.map` / `Pool.imap_unordered` over manual Process management.
- Watch for pickling overhead: large objects passed to workers are serialized. Keep payloads small.
- Use `threading` (not multiprocessing) for I/O-bound parallelism (GIL is released during I/O).

#### NumPy Vectorization
- Replace Python loops over numeric data with vectorized operations:
  ```python
  # Bad: 100x slower
  result = [x * 2 + 1 for x in data]
  # Good: vectorized
  result = data * 2 + 1
  ```
- Use boolean indexing instead of conditional loops:
  ```python
  # Bad
  filtered = [x for x in data if x > threshold]
  # Good
  filtered = data[data > threshold]
  ```
- Use `np.where` for conditional assignment, `np.einsum` for tensor operations.
- Avoid creating intermediate arrays in chains. Use `out=` parameter or in-place operations.
- For operations NumPy cannot vectorize: try `numba.jit(nopython=True)`.

#### Generator Pipelines (Memory Efficiency)
- Use generators for processing large datasets that do not fit in memory:
  ```python
  def read_chunks(path, chunk_size=8192):
      with open(path, "rb") as f:
          while chunk := f.read(chunk_size):
              yield chunk

  def process_pipeline(path):
      chunks = read_chunks(path)
      decoded = (chunk.decode("utf-8") for chunk in chunks)
      lines = (line for chunk in decoded for line in chunk.splitlines())
      return (parse(line) for line in lines if line.strip())
  ```
- Use `itertools` (chain, islice, groupby) for composing lazy pipelines.
- For pandas: use `chunksize` parameter in `read_csv` for row-by-row processing.

#### Memory Optimization
- Use `__slots__` on data classes with many instances:
  ```python
  class Point:
      __slots__ = ("x", "y", "z")
      def __init__(self, x: float, y: float, z: float):
          self.x, self.y, self.z = x, y, z
  # Saves ~40% memory per instance vs regular class
  ```
- Use `sys.getsizeof` and `pympler.asizeof` to measure object memory.
- Prefer `array.array` over lists for homogeneous numeric data.
- Use `weakref` for caches that should not prevent garbage collection.
- Intern frequently repeated strings: `sys.intern(string)`.

#### C Extension Paths (When Python Is Not Fast Enough)
- **Cython**: annotate hot functions with `cdef` types for 10-100x speedup.
- **pybind11**: wrap existing C++ code with minimal boilerplate.
- **ctypes/cffi**: call existing shared libraries without compilation.
- **Decision rule**: Only reach for C extensions after profiling proves Python is the
  bottleneck AND vectorization/multiprocessing cannot solve it.

### After implementation
1. Re-run the same profiling tool used for the baseline.
2. Compare before/after measurements with the same input data.
3. Document the optimization in a comment or docstring explaining WHY and the measured improvement:
   ```python
   # Optimized from 4.2s to 0.3s by vectorizing the distance calculation.
   # See: profiling results in docs/perf/distance-calc-2024-03.md
   ```
4. Verify correctness: optimized code must produce identical results to the original.
5. Run the test suite to ensure no regressions.

## Performance anti-patterns to flag

- Premature `@lru_cache` on functions with large/unhashable arguments (memory leak).
- `global` interpreter lock assumptions (using threads for CPU-bound work).
- String concatenation in loops (`+=` creates new string each time; use `"".join(parts)`).
- Repeated dictionary/attribute lookups in tight loops (hoist outside).
- Using `pandas` for row-by-row iteration (`iterrows` is 100x slower than vectorized).
- Creating DataFrames inside loops (pre-allocate or use list-of-dicts then single concat).

## Self-check before task completion

Before marking a task done when this skill was active:

- [ ] Baseline measurement exists (before optimization).
- [ ] After measurement shows quantified improvement.
- [ ] Profiling tool output confirms the hotspot was addressed.
- [ ] Correctness verified (same output as before optimization).
- [ ] No new memory leaks introduced (check with tracemalloc for long-running processes).
- [ ] Test suite passes without regressions.
- [ ] Optimization is documented with measured numbers in code or docs.
- [ ] No premature optimization: only the measured bottleneck was addressed.
