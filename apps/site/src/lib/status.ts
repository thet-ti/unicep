import {
  awesomeApi,
  brasilApi,
  type CepProvider,
  type CircuitStatus,
  type HttpProviderOptions,
  openCep,
  Unicep,
  viaCep,
} from '@unicep/core';

/** A CEP that every service knows; used only to probe availability and latency. */
const PROBE_CEP = '01310100';

export interface ProviderStatus {
  id: string;
  name: string;
  url: string;
  online: boolean;
  /** Response time of the probe in milliseconds, `null` when the provider is offline. */
  latencyMs: number | null;
  circuit: CircuitStatus;
}

export interface StatusSnapshot {
  /** ISO 8601 timestamp of the check. */
  checkedAt: string;
  providers: ProviderStatus[];
}

export interface StatusServiceOptions extends HttpProviderOptions {
  /** AwesomeAPI key; the service may reject anonymous requests from cloud hosts. */
  awesomeApiKey?: string | undefined;
  /** How long a snapshot is shared between visitors. Default: 60000. */
  cacheMs?: number;
  /** Probe timeout per provider. Default: 5000. */
  timeoutMs?: number;
  /** Clock, for tests. */
  now?: () => number;
}

interface Target {
  id: string;
  name: string;
  url: string;
  provider: CepProvider;
}

/**
 * Probes every provider through its own `Unicep` instance, so the circuit breaker state shown on
 * the page is the real one the library would use. Results are cached and shared, and concurrent
 * requests share one in-flight check, so public traffic never multiplies calls to the services.
 */
export function createStatusService(options: StatusServiceOptions = {}) {
  const { cacheMs = 60_000, timeoutMs = 5_000, now = Date.now, awesomeApiKey, ...http } = options;

  const targets: Target[] = [
    { id: 'viacep', name: 'ViaCEP', url: 'https://viacep.com.br', provider: viaCep(http) },
    {
      id: 'brasilapi',
      name: 'BrasilAPI',
      url: 'https://brasilapi.com.br',
      provider: brasilApi(http),
    },
    { id: 'opencep', name: 'OpenCEP', url: 'https://opencep.com', provider: openCep(http) },
    {
      id: 'awesomeapi',
      name: 'AwesomeAPI',
      url: 'https://docs.awesomeapi.com.br/api-cep',
      provider: awesomeApi({ ...http, apiKey: awesomeApiKey }),
    },
  ];

  const probes = targets.map((target) => ({
    target,
    unicep: new Unicep({
      providers: [target.provider],
      timeoutMs,
      circuitBreaker: { failureThreshold: 2, resetTimeoutMs: 30_000 },
    }),
  }));

  async function check({ target, unicep }: (typeof probes)[number]): Promise<ProviderStatus> {
    const start = performance.now();
    let online = true;
    try {
      await unicep.lookup(PROBE_CEP);
    } catch {
      // The probe CEP exists everywhere, so any error means the service is not working.
      online = false;
    }
    const latencyMs = online ? Math.round(performance.now() - start) : null;
    return {
      id: target.id,
      name: target.name,
      url: target.url,
      online,
      latencyMs,
      circuit: unicep.status()[0]?.circuit ?? 'closed',
    };
  }

  let snapshot: StatusSnapshot | undefined;
  let expiresAt = 0;
  let inflight: Promise<StatusSnapshot> | undefined;

  async function refresh(): Promise<StatusSnapshot> {
    const providers = await Promise.all(probes.map(check));
    snapshot = { checkedAt: new Date(now()).toISOString(), providers };
    expiresAt = now() + cacheMs;
    return snapshot;
  }

  return {
    /** Current status, reusing the last snapshot while it is fresh. */
    getStatus(): Promise<StatusSnapshot> {
      if (snapshot && now() < expiresAt) return Promise.resolve(snapshot);
      inflight ??= refresh().finally(() => {
        inflight = undefined;
      });
      return inflight;
    },
  };
}

/** Shared instance used by the page. */
export const { getStatus } = createStatusService({
  // Set on the server (Render environment variable); never exposed to the browser.
  awesomeApiKey: process.env.AWESOMEAPI_KEY || undefined,
});
