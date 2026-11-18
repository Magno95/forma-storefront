type Operation = "catalog" | "cart" | "payment-options" | "checkout";

const responseTimes = {
  catalog: 650,
  cart: 350,
  "payment-options": 700,
  checkout: 1150,
} satisfies Record<Operation, number>;

export class MockServiceUnavailable extends Error {
  constructor(readonly operation: Operation) {
    super(`Mock service unavailable: ${operation}`);
  }
}

export class MockService {
  constructor(private readonly delays: Record<Operation, number> = responseTimes) {}

  async run<T>(operation: Operation, respond: () => T | Promise<T>, signal?: AbortSignal): Promise<T> {
    const scenario = process.env.MOCK_SCENARIO;
    const delay = scenario === "instant" ? 0 : this.delays[operation] * (scenario === "slow" ? 3 : 1);
    await new Promise<void>((resolve, reject) => {
      if (signal?.aborted) {
        reject(signal.reason);
        return;
      }

      function abort() {
        clearTimeout(timer);
        reject(signal?.reason);
      }

      const timer = setTimeout(() => {
        signal?.removeEventListener("abort", abort);
        resolve();
      }, delay);
      signal?.addEventListener("abort", abort, { once: true });
    });

    if (scenario === "error" && process.env.MOCK_FAIL_OPERATION === operation) {
      throw new MockServiceUnavailable(operation);
    }
    return respond();
  }
}

export const mockService = new MockService();
