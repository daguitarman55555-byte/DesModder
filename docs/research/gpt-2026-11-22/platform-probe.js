/* Package this as an ordinary script in the browser realm being tested. */
(() => {
  const scope = globalThis;
  if (
    typeof document === "undefined" &&
    typeof scope.addEventListener === "function"
  ) {
    scope.addEventListener("message", (event) => {
      if (event.data?.type !== "desmodder-platform-probe") return;
      const cell = new Int32Array(event.data.shared);
      Atomics.add(cell, 0, 1);
      scope.postMessage({
        value: Atomics.load(cell, 0),
        isolated: scope.crossOriginIsolated === true,
      });
    });
    return;
  }

  const emptyModule = Uint8Array.of(0, 97, 115, 109, 1, 0, 0, 0);
  const simdModule = Uint8Array.of(
    ...emptyModule,
    1,
    4,
    1,
    96,
    0,
    0,
    3,
    2,
    1,
    0,
    10,
    9,
    1,
    7,
    0,
    65,
    0,
    253,
    15,
    26,
    11
  );

  async function probeWebGPU() {
    const adapter = await scope.navigator?.gpu?.requestAdapter();
    if (!adapter) return null;
    const device = await adapter.requestDevice();
    const usage = scope.GPUBufferUsage;
    const bytes = 4;
    const output = device.createBuffer({
      size: bytes,
      usage: usage.STORAGE | usage.COPY_SRC,
    });
    const readback = device.createBuffer({
      size: bytes,
      usage: usage.COPY_DST | usage.MAP_READ,
    });
    let mapped = false;
    try {
      const shader = device.createShaderModule({
        code: [
          "@group(0) @binding(0) var<storage,read_write> data: array<u32>;",
          "@compute @workgroup_size(1) fn main() { data[0] = 42u; }",
        ].join("\n"),
      });
      const pipeline = await device.createComputePipelineAsync({
        layout: "auto",
        compute: { module: shader, entryPoint: "main" },
      });
      const group = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [{ binding: 0, resource: { buffer: output } }],
      });
      const commands = device.createCommandEncoder();
      const pass = commands.beginComputePass();
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, group);
      pass.dispatchWorkgroups(1);
      pass.end();
      commands.copyBufferToBuffer(output, 0, readback, 0, bytes);
      device.queue.submit([commands.finish()]);
      await readback.mapAsync(scope.GPUMapMode.READ);
      mapped = true;
      const actual = new Uint32Array(readback.getMappedRange())[0];
      return {
        integerCompute: actual === 42,
        adapter: Object.fromEntries(
          [
            "vendor",
            "architecture",
            "device",
            "description",
            "isFallbackAdapter",
          ].map((key) => [key, adapter.info?.[key]])
        ),
        timestampQuery: adapter.features.has("timestamp-query"),
        maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize,
      };
    } finally {
      if (mapped) readback.unmap();
      output.destroy();
      readback.destroy();
      device.destroy();
    }
  }

  async function probeWorker(workerURL, shared) {
    const worker = new Worker(workerURL);
    try {
      return await new Promise((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error("Worker did not answer in 3 seconds.")),
          3000
        );
        worker.onmessage = ({ data }) => {
          clearTimeout(timer);
          resolve({
            ...data,
            sharedWriteVerified: Atomics.load(new Int32Array(shared), 0) === 42,
          });
        };
        worker.onerror = (event) => {
          clearTimeout(timer);
          reject(new Error(event.message || "Worker failed to start."));
        };
        try {
          const cell = new Int32Array(shared);
          Atomics.store(cell, 0, 41);
          worker.postMessage({ type: "desmodder-platform-probe", shared });
        } catch (error) {
          clearTimeout(timer);
          reject(error);
        }
      });
    } finally {
      worker.terminate();
    }
  }

  const attempt = async (action) => {
    try {
      return await action();
    } catch (error) {
      return { error: String(error) };
    }
  };

  scope.desmodderPlatformProbe = async ({ workerURL } = {}) => {
    let shared;
    const memory = await attempt(() => {
      shared = new WebAssembly.Memory({ shared: true, initial: 1, maximum: 1 })
        .buffer;
      return (
        typeof SharedArrayBuffer !== "undefined" &&
        shared instanceof SharedArrayBuffer
      );
    });
    const [wasmCompile, wasmSIMDCompile, sharedWorkerRoundTrip, webgpu] =
      await Promise.all([
        attempt(async () => !!(await WebAssembly.compile(emptyModule))),
        attempt(async () => !!(await WebAssembly.compile(simdModule))),
        workerURL && memory === true
          ? attempt(() => probeWorker(workerURL, shared))
          : null,
        attempt(probeWebGPU),
      ]);
    return {
      origin: scope.location?.origin,
      userAgent: scope.navigator?.userAgent,
      crossOriginIsolated: scope.crossOriginIsolated === true,
      sharedArrayBuffer: typeof scope.SharedArrayBuffer,
      wasmCompile,
      wasmSIMDCompile,
      sharedMemory: memory,
      sharedWorkerRoundTrip,
      webgpu,
    };
  };
})();
