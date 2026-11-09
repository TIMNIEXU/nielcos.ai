/* Terminal49 integration — ocean container tracking with terminal-level
   release data (customs / carrier holds, pickup availability, LFD, fees).

   Server-only: reads TERMINAL49_API_KEY from the environment. The key is
   NEVER exposed to the client; the public API route proxies and normalizes.

   Data honesty rules (product law):
   - "Customs released" here is the terminal/carrier-reported customs
     status (CBP messages relayed to the terminal), NOT the filer's raw
     ACE entry record. The UI must say so and show the fetch time.
   - When the POD terminal is not covered by Terminal49 terminal
     integrations, holds/fees arrays may be absent — that is "unknown",
     never "released". */

const BASE = "https://api.terminal49.com/v2";

export type TrackRequestType = "container" | "bill_of_lading" | "booking_number";

export function t49Configured(): boolean {
  return Boolean(process.env.TERMINAL49_API_KEY);
}

async function t49Fetch(path: string, init?: RequestInit): Promise<any> {
  const key = process.env.TERMINAL49_API_KEY;
  if (!key) throw new T49Error("not_configured", 503);
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Token ${key}`,
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      ...(init?.headers ?? {}),
    },
    signal: AbortSignal.timeout(20000),
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON body */
  }
  if (!res.ok) {
    const msg =
      json?.errors?.[0]?.detail ??
      json?.errors?.[0]?.title ??
      json?.message ??
      `Terminal49 HTTP ${res.status}`;
    // Free-plan accounts may create tracking requests but reads are gated
    // until a trial/paid plan is active — surface that distinctly.
    if (res.status === 401 && /permissions|paid plan|trial/i.test(String(msg))) {
      throw new T49Error("api_restricted", 503, String(msg));
    }
    if (res.status === 401) throw new T49Error("bad_key", 503, String(msg));
    if (res.status === 404) throw new T49Error("not_found", 404, String(msg));
    if (res.status === 422) throw new T49Error("invalid_number", 422, String(msg));
    throw new T49Error("upstream_error", 502, String(msg));
  }
  return json;
}

export class T49Error extends Error {
  code: string;
  status: number;
  /** Non-sensitive diagnostic trail (which lookup paths were tried and how
      each failed) — surfaced by the API on not_found so a bad number can be
      told apart from a carrier-side gap without reading server logs. */
  detail?: string;
  constructor(code: string, status: number, message?: string, detail?: string) {
    super(message ?? code);
    this.code = code;
    this.status = status;
    this.detail = detail;
  }
}

/* ------------------------- normalized display model ------------------------ */

export type Hold = { name: string; status: string; description: string | null };
export type Fee = { type: string; amount: number; currency: string };
export type ReleaseState = "released" | "hold" | "unknown";

export type TrackEvent = {
  event: string;
  timestamp: string | null;
  location: string | null;
};

export type NormalizedContainer = {
  container_number: string;
  equipment: string | null;
  terminal: string | null;
  available_for_pickup: boolean | null;
  terminal_supported: boolean;
  customs_state: ReleaseState;
  customs_holds: Hold[];
  carrier_state: ReleaseState;
  carrier_holds: Hold[];
  other_holds: Hold[];
  pickup_ready: boolean | null;
  picked_up: boolean;
  last_free_day: string | null;
  fees: Fee[];
  events: TrackEvent[];
};

export type NormalizedShipment = {
  bill_of_lading_number: string | null;
  booking_number: string | null;
  shipping_line: string | null;
  shipping_line_scac: string | null;
  vessel: string | null;
  voyage: string | null;
  pol: string | null;
  pod: string | null;
  eta: string | null;
  arrived_at: string | null;
};

const CUSTOMS_HOLDS = new Set(["customs", "usda", "vacis"]);
const CARRIER_HOLDS = new Set(["freight", "line"]);

/** Discharge at the port of discharge only — transshipment discharges
    happen mid-voyage and must never mark a container as released. */
export function isPodDischarge(eventName: string): boolean {
  if (/transshipment/i.test(eventName)) return false;
  const seg = eventName.toLowerCase().split(".").pop() ?? "";
  return /discharge/.test(seg);
}

/** Derive arrival / ETA from container events when the shipment object
    itself carries neither. A real arrival wins over ETA; estimated events
    only feed ETA, never arrival. Shared by the shipment-doc path and the
    container-list fallback, whose sideloaded shipment has no ETA of its
    own (live case ONEU5222584: estimated.vessel_arrived 2026-11-15 was
    visible in the events but eta stayed null on that path). */
export function applyEventFallbacks(shipment: NormalizedShipment, events: TrackEvent[]): void {
  if (!shipment.arrived_at) {
    const arrival = events
      .filter((e) => /vessel_arrived|vessel_arrival|berth/i.test(e.event) && e.timestamp && !/estimated/i.test(e.event))
      .sort((x, y) => String(x.timestamp).localeCompare(String(y.timestamp)))[0];
    if (arrival?.timestamp) shipment.arrived_at = arrival.timestamp;
  }
  if (!shipment.eta && !shipment.arrived_at) {
    const est = events
      .filter((e) => /estimated/i.test(e.event) && /arriv/i.test(e.event) && e.timestamp)
      .sort((x, y) => String(x.timestamp).localeCompare(String(y.timestamp)))[0];
    if (est?.timestamp) shipment.eta = est.timestamp;
  }
}

function s(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v : null;
}
function pick(obj: any, keys: string[]): string | null {
  for (const k of keys) {
    const v = s(obj?.[k]);
    if (v) return v;
  }
  return null;
}

function mapIncluded(doc: any): Map<string, any> {
  const map = new Map<string, any>();
  const inc = Array.isArray(doc?.included) ? doc.included : [];
  for (const r of inc) {
    if (r?.type && r?.id) map.set(`${r.type}:${r.id}`, r);
  }
  if (doc?.data?.type && doc?.data?.id) map.set(`${doc.data.type}:${doc.data.id}`, doc.data);
  return map;
}

function relOne(map: Map<string, any>, resource: any, name: string): any | null {
  const d = resource?.relationships?.[name]?.data;
  if (!d) return null;
  return map.get(`${d.type}:${d.id}`) ?? null;
}
function relMany(map: Map<string, any>, resource: any, name: string): any[] {
  const arr = resource?.relationships?.[name]?.data;
  if (!Array.isArray(arr)) return [];
  return arr.map((d: any) => map.get(`${d.type}:${d.id}`)).filter(Boolean);
}

export function normalizeContainer(
  c: any,
  map: Map<string, any>,
  ctx: { discharged: boolean }
): NormalizedContainer {
  const a = c?.attributes ?? {};
  const holdsRaw: Hold[] = Array.isArray(a.holds_at_pod_terminal)
    ? a.holds_at_pod_terminal.map((h: any) => ({
        name: String(h?.name ?? "other").toLowerCase(),
        status: String(h?.status ?? "hold").toLowerCase(),
        description: s(h?.description),
      }))
    : [];
  const fees: Fee[] = Array.isArray(a.fees_at_pod_terminal)
    ? a.fees_at_pod_terminal
        .filter((f: any) => typeof f?.amount === "number")
        .map((f: any) => ({
          type: String(f?.type ?? "other"),
          amount: f.amount,
          currency: s(f?.currency_code) ?? "USD",
        }))
    : [];

  const terminalRes = relOne(map, c, "pod_terminal");
  // Terminal data counts as supported when the terminal is linked or the
  // holds/fees keys are present at all (even empty). Missing keys = no
  // terminal feed for this POD = release states stay "unknown".
  const terminal_supported =
    Boolean(terminalRes) ||
    a.holds_at_pod_terminal !== undefined ||
    a.fees_at_pod_terminal !== undefined;

  const customs_holds = holdsRaw.filter((h) => CUSTOMS_HOLDS.has(h.name));
  const carrier_holds = holdsRaw.filter((h) => CARRIER_HOLDS.has(h.name));
  const other_holds = holdsRaw.filter(
    (h) => !CUSTOMS_HOLDS.has(h.name) && !CARRIER_HOLDS.has(h.name)
  );

  const derive = (hs: Hold[]): ReleaseState => {
    if (hs.length > 0) return "hold";
    if (ctx.discharged && terminal_supported) return "released";
    return "unknown";
  };

  const available = typeof a.available_for_pickup === "boolean" ? a.available_for_pickup : null;
  let pickup_ready: boolean | null = null;
  if (holdsRaw.length > 0) pickup_ready = false;
  else if (available === true) pickup_ready = true;
  else if (available === false) pickup_ready = false;

  const events: TrackEvent[] = relMany(map, c, "transport_events")
    .map((e: any) => ({
      event: pick(e?.attributes, ["event", "event_type", "type", "name"]) ?? "event",
      timestamp: pick(e?.attributes, ["timestamp", "event_at", "occurred_at", "created_at"]),
      location: pick(e?.attributes, ["location", "location_name", "port_name"]),
    }))
    .sort((x, y) => String(x.timestamp ?? "").localeCompare(String(y.timestamp ?? "")));

  const equipParts = [
    a.equipment_length ? `${a.equipment_length}ft` : null,
    s(a.equipment_height),
    s(a.equipment_type),
  ].filter(Boolean);

  // Already left the terminal: a gate-out or empty-return event means the
  // pickup question is settled — the banner must not say "not ready".
  const picked_up = events.some((e) => /gate_out|empty_in|empty.*return/i.test(e.event));

  return {
    container_number: s(a.number) ?? "",
    equipment: equipParts.length ? equipParts.join(" ") : null,
    terminal: terminalRes ? s(terminalRes.attributes?.name) : null,
    available_for_pickup: available,
    terminal_supported,
    customs_state: derive(customs_holds),
    customs_holds,
    carrier_state: derive(carrier_holds),
    carrier_holds,
    other_holds,
    pickup_ready,
    picked_up,
    last_free_day: pick(a, ["pickup_lfd", "last_free_day", "pickup_last_free_day", "lfd"]),
    fees,
    events,
  };
}

export function normalizeShipmentResource(sh: any, map: Map<string, any>): NormalizedShipment {
  const a = sh?.attributes ?? {};
  const line = sh ? relOne(map, sh, "shipping_line") : null;
  const pol = sh ? relOne(map, sh, "port_of_loading") : null;
  const pod = sh ? relOne(map, sh, "port_of_discharge") : null;
  const ts = a.timestamps ?? {};
  return {
    bill_of_lading_number: s(a.bill_of_lading_number),
    booking_number: s(a.booking_number),
    shipping_line: line ? s(line.attributes?.name) : null,
    shipping_line_scac: s(a.shipping_line_scac) ?? (line ? s(line.attributes?.scac) : null),
    vessel: pick(a, ["vessel_name", "vessel"]),
    voyage: pick(a, ["voyage_number", "voyage"]),
    pol: pol ? s(pol.attributes?.name) : null,
    pod: pod ? s(pod.attributes?.name) : null,
    eta: pick(a, ["estimated_time_of_arrival", "eta", "pod_eta"]) ?? s(ts.estimated_arrival_at),
    arrived_at:
      pick(a, ["actual_time_of_arrival", "arrived_at"]) ??
      s(ts.vessel_arrived_at) ??
      s(ts.arrived_at),
  };
}

export function normalizeShipment(doc: any, map: Map<string, any>): NormalizedShipment {
  const sh = doc?.data?.type === "shipments" ? doc.data : null;
  return normalizeShipmentResource(sh, map);
}

export function normalizeShipmentDoc(doc: any): {
  shipment: NormalizedShipment;
  containers: NormalizedContainer[];
} {
  const map = mapIncluded(doc);
  const shipment = normalizeShipment(doc, map);
  const containersRaw =
    doc?.data?.type === "shipments" ? relMany(map, doc.data, "containers") : [];
  // Discharge detection: a discharge event AT THE POD, or the shipment
  // having an arrival timestamp. A transshipment discharge must NOT count —
  // the box is still on the water afterwards (live case ONEU5222584:
  // transshipment discharge in October, US arrival mid-November; counting
  // it marked customs "released" before the vessel even reached the US).
  const containers: NormalizedContainer[] = containersRaw.map((c: any) => {
    const evts = relMany(map, c, "transport_events");
    const discharged =
      evts.some((e: any) => isPodDischarge(String(e?.attributes?.event ?? e?.attributes?.event_type ?? ""))) ||
      Boolean(shipment.arrived_at);
    return normalizeContainer(c, map, { discharged });
  });
  // Arrival / ETA fallback: derive from container events when the shipment
  // object itself carries no arrival timestamp.
  applyEventFallbacks(shipment, containers.flatMap((c) => c.events));
  return { shipment, containers };
}

/* ------------------------------ lookup flow ------------------------------- */

export type LookupResult =
  | {
      status: "ready";
      shipment: NormalizedShipment;
      containers: NormalizedContainer[];
      fetched_at: string;
    }
  | { status: "processing"; fetched_at: string };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function createTrackingRequest(
  requestType: TrackRequestType,
  requestNumber: string,
  scac?: string
): Promise<string | null> {
  const attributes: Record<string, unknown> = {
    request_type: requestType,
    request_number: requestNumber,
  };
  if (scac) attributes.scac = scac;
  else attributes.auto_detect_vocc_scac = true;
  const doc = await t49Fetch("/tracking_requests", {
    method: "POST",
    body: JSON.stringify({
      data: { type: "tracking_requests", attributes },
    }),
  });
  return s(doc?.data?.id);
}

async function pollShipmentId(trId: string | null): Promise<PollOutcome> {
  if (!trId) return { id: null, failed: false };
  for (let i = 0; i < 5; i++) {
    const r = await trackingRequestShipmentId(trId);
    if (r.id || r.failed) return r;
    await sleep(2500);
  }
  return { id: null, failed: false };
}

/** Create a tracking request and poll it; a provider 422 counts as failed. */
async function createAndPoll(
  requestType: TrackRequestType,
  requestNumber: string,
  scac?: string
): Promise<PollOutcome> {
  try {
    const trId = await createTrackingRequest(requestType, requestNumber, scac);
    return await pollShipmentId(trId);
  } catch (e) {
    if (e instanceof T49Error && e.code === "invalid_number") {
      // Keep the provider's own words — a bare "422" cannot tell a bad
      // number from an account/plan limit, and they need opposite fixes.
      return { id: null, failed: true, reason: `422:${e.message}`.slice(0, 160) };
    }
    throw e;
  }
}

type PollOutcome = { id: string | null; failed: boolean; reason?: string };

async function trackingRequestShipmentId(trId: string): Promise<PollOutcome> {
  const doc = await t49Fetch(`/tracking_requests/${trId}`);
  const rel = doc?.data?.relationships?.shipment?.data;
  if (rel?.id) return { id: String(rel.id), failed: false };
  const status = String(doc?.data?.attributes?.status ?? "");
  // A "failed" request does NOT prove the number is unknown: Terminal49 can
  // fail the request (e.g. carrier container endpoint) while the container
  // object itself exists in the account — the fallback lookup decides.
  if (/fail|error/i.test(status)) {
    return {
      id: null,
      failed: true,
      reason: s(doc?.data?.attributes?.failed_reason) ?? status,
    };
  }
  return { id: null, failed: false };
}

async function fetchShipmentDoc(shipmentId: string): Promise<any> {
  const include =
    "containers,containers.transport_events,containers.pod_terminal,shipping_line,port_of_loading,port_of_discharge";
  try {
    return await t49Fetch(`/shipments/${shipmentId}?include=${include}`);
  } catch (e) {
    if (e instanceof T49Error && (e.status === 400 || e.status === 422)) {
      return await t49Fetch(`/shipments/${shipmentId}?include=containers,containers.transport_events`);
    }
    throw e;
  }
}

async function findContainerDoc(containerNumber: string): Promise<any | null> {
  try {
    const doc = await t49Fetch(
      `/containers?filter[number]=${encodeURIComponent(containerNumber)}&include=transport_events,pod_terminal,shipment`
    );
    const first = Array.isArray(doc?.data) ? doc.data[0] : null;
    return first ? { data: first, included: doc.included ?? [] } : null;
  } catch {
    return null;
  }
}

/** Build a ready result from the account's container object, when a
    tracking request (auto-detected or SCAC-tagged) has already resolved
    this number into the account. Null when the account has no such
    container. */
async function readyFromContainerDoc(
  containerNumber: string,
  fetched_at: string
): Promise<LookupResult | null> {
  const cdoc = await findContainerDoc(containerNumber);
  if (!cdoc?.data) return null;
  const map = mapIncluded(cdoc);
  const shipRel = cdoc.data?.relationships?.shipment?.data;
  // The container list response sideloads the shipment resource —
  // its attributes alone (MBL, vessel, voyage, SCAC) fill the header.
  const shipRes = relOne(map, cdoc.data, "shipment");
  let shipment: NormalizedShipment = normalizeShipmentResource(shipRes, map);
  const evts = relMany(map, cdoc.data, "transport_events");
  const discharged = evts.some((e: any) => isPodDischarge(String(e?.attributes?.event ?? "")));
  if (shipRel?.id) {
    try {
      const sdoc = await fetchShipmentDoc(String(shipRel.id));
      const norm = normalizeShipmentDoc(sdoc);
      if (norm.containers.length > 0) {
        return { status: "ready", shipment: norm.shipment, containers: norm.containers, fetched_at };
      }
      if (norm.shipment.bill_of_lading_number || norm.shipment.vessel) {
        shipment = norm.shipment;
      }
    } catch {
      /* keep the sideloaded shipment */
    }
  }
  const container = normalizeContainer(cdoc.data, map, { discharged });
  // The sideloaded shipment carries no ETA/arrival of its own, and the
  // shipment-doc attempt above may have returned no containers — derive
  // both from this container's events, same rules as normalizeShipmentDoc.
  applyEventFallbacks(shipment, container.events);
  return { status: "ready", shipment, containers: [container], fetched_at };
}

/** Carrier prediction for a number, from Terminal49's Infer endpoint
    (ML over historical movements). Auto-detect inside a tracking request
    fails outright on lessor-owned boxes (live case FDCU0524219: FDCU is
    Florens, the box owner — the carrier moving it is ONE) because the
    prefix names the owner, not the VOCC; the request dies with
    scac_auto_detect_failed. Infer predicts the actual carrier from the
    box's movement history (Terminal49 claims ~9 of 10 for containers).
    Returns the decision plus up to 3 candidate SCACs, best first.
    Never throws — inference is a fallback, not a dependency. */
async function inferScac(requestNumber: string): Promise<{ decision: string; candidates: string[] }> {
  try {
    const doc = await t49Fetch("/tracking_requests/infer_number", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ number: requestNumber }),
    });
    const line = doc?.data?.attributes?.shipping_line;
    const ordered: string[] = [];
    const sel = s(line?.selected?.scac);
    if (sel) ordered.push(sel);
    const cands: any[] = Array.isArray(line?.candidates) ? line.candidates : [];
    for (const c of cands) {
      const scac = s(c?.scac);
      if (scac) ordered.push(scac);
    }
    return {
      decision: s(line?.decision) ?? "unknown",
      candidates: [...new Set(ordered)].slice(0, 3),
    };
  } catch {
    return { decision: "error", candidates: [] };
  }
}

/** Infer-guided retry: create tracking requests with each predicted SCAC
    explicitly. Returns a ready/processing result, or null when every
    candidate failed (the diary records how). A candidate that is accepted
    but still resolving short-circuits to "processing" — the next lookup
    finds it via the account check instead of burning more candidates. */
async function inferRetry(
  requestType: TrackRequestType,
  requestNumber: string,
  fetched_at: string,
  diary: string[]
): Promise<LookupResult | null> {
  const { decision, candidates } = await inferScac(requestNumber);
  diary.push(`infer:${decision}:${candidates.length ? candidates.join("/") : "none"}`);
  for (const scac of candidates) {
    const r = await createAndPoll(requestType, requestNumber, scac);
    if (r.id) {
      const doc = await fetchShipmentDoc(r.id);
      const norm = normalizeShipmentDoc(doc);
      if (norm.containers.length > 0) {
        return { status: "ready", shipment: norm.shipment, containers: norm.containers, fetched_at };
      }
      return { status: "processing", fetched_at };
    }
    if (!r.failed) return { status: "processing", fetched_at };
    diary.push(`scac:${scac}:failed:${r.reason ?? "?"}`);
  }
  return null;
}

/** One lookup attempt. Returns null when every path failed with nothing
    found (the caller retries once before declaring the number unknown).
    Every path taken is noted in `diary` (short codes) so a not_found can
    carry its own diagnosis. */
async function attemptLookup(
  requestType: TrackRequestType,
  requestNumber: string,
  allowInfer = false,
  diary: string[] = []
): Promise<LookupResult | null> {
  const fetched_at = new Date().toISOString();
  // Account first for containers: a request created by an earlier lookup
  // (auto-detected or SCAC-tagged) may already have resolved this box —
  // serve it instead of creating duplicate requests.
  if (requestType === "container") {
    const pre = await readyFromContainerDoc(requestNumber, fetched_at);
    if (pre) return pre;
  }
  const first = await createAndPoll(requestType, requestNumber);
  let shipmentId = first.id;
  let failed = first.failed;
  if (failed && !shipmentId) diary.push(`auto_failed:${first.reason ?? "?"}`);
  // Auto-detect sometimes fails on MBLs; the number's 4-letter prefix is
  // the carrier SCAC for most lines — retry once with it explicitly.
  if (!shipmentId && failed && requestType === "bill_of_lading" && /^[A-Z]{4}/.test(requestNumber)) {
    const prefix = requestNumber.slice(0, 4);
    const retry = await createAndPoll(requestType, requestNumber, prefix);
    shipmentId = retry.id;
    failed = retry.failed;
    if (failed && !shipmentId) diary.push(`prefix_scac_failed:${prefix}:${retry.reason ?? "?"}`);
    // The prefix is NOT always the SCAC (MSC: prefix MEDU, SCAC MSCU) —
    // fall back to Infer's predicted carriers before giving up.
    if (!shipmentId && failed && allowInfer) {
      const viaInfer = await inferRetry(requestType, requestNumber, fetched_at, diary);
      if (viaInfer) return viaInfer;
    }
  }

  if (shipmentId) {
    const doc = await fetchShipmentDoc(shipmentId);
    const { shipment, containers } = normalizeShipmentDoc(doc);
    if (containers.length > 0) {
      return { status: "ready", shipment, containers, fetched_at };
    }
    return { status: "processing", fetched_at };
  }

  // Fallback for container-number lookups already resolved in the account.
  if (requestType === "container") {
    const viaDoc = await readyFromContainerDoc(requestNumber, fetched_at);
    if (viaDoc) return viaDoc;

    // Auto-detect failed and the account has nothing: the classic case is
    // a lessor-owned box whose prefix names the owner, not the carrier.
    // Ask Infer for candidate carriers and retry with each SCAC explicitly.
    if (failed && allowInfer) {
      const viaInfer = await inferRetry(requestType, requestNumber, fetched_at, diary);
      if (viaInfer) return viaInfer;
    }
  }

  // Both the tracking request and any account fallback came up empty with a
  // provider-side failure — signal the caller to retry once, then give up.
  if (failed) return null;
  return { status: "processing", fetched_at };
}

/** Create (or reuse) a tracking request and return normalized data.
    Terminal49 resolves new numbers asynchronously; while it works we
    return { status: "processing" } and the client polls again. A first-ever
    registration can also fail transiently while the identical number
    resolves on a later attempt (observed live on fresh ONE/Evergreen
    boxes), so a failed-empty attempt is retried once before the number
    is declared unknown — e.g. MSC, which genuinely does not support
    container-number tracking: the right guidance there is to try the MBL.
    A container whose auto-detect failed gets one Infer-guided round of
    explicit-SCAC retries in the first attempt (lessor-owned boxes). */
export async function lookupContainer(
  requestType: TrackRequestType,
  requestNumber: string
): Promise<LookupResult> {
  const diary: string[] = [];
  const first = await attemptLookup(requestType, requestNumber, true, diary);
  if (first) return first;
  await sleep(6000);
  const second = await attemptLookup(requestType, requestNumber, false, diary);
  if (second) return second;
  throw new T49Error(
    "not_found",
    404,
    "No tracking data found for this number.",
    diary.join(" | ").slice(0, 500)
  );
}
