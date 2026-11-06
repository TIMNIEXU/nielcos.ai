/* Verification for the Terminal49 normalization layer (lib/terminal49.ts).
   Fixtures mirror the documented V2 JSON:API shapes: container attributes
   (available_for_pickup, holds_at_pod_terminal, fees_at_pod_terminal,
   pickup_lfd), included terminals/lines/ports, and transport events.
   Run: npx tsx scripts/test_terminal49.ts */
import { normalizeShipmentDoc } from "../lib/terminal49";

let failures = 0;
function check(name: string, cond: boolean, extra?: unknown) {
  if (cond) console.log(`  PASS ${name}`);
  else {
    failures++;
    console.log(`  FAIL ${name}`, extra ?? "");
  }
}

const docWithHolds: any = {
  data: {
    type: "shipments",
    id: "shp-1",
    attributes: {
      bill_of_lading_number: "MAEU123456789",
      vessel_name: "MAERSK SENTOSA",
      voyage_number: "432N",
      shipping_line_scac: "MAEU",
    },
    relationships: {
      containers: { data: [{ type: "containers", id: "c1" }, { type: "containers", id: "c2" }] },
      shipping_line: { data: { type: "shipping_lines", id: "sl1" } },
      port_of_loading: { data: { type: "ports", id: "p1" } },
      port_of_discharge: { data: { type: "ports", id: "p2" } },
    },
  },
  included: [
    { type: "shipping_lines", id: "sl1", attributes: { name: "Maersk", scac: "MAEU" } },
    { type: "ports", id: "p1", attributes: { name: "Shanghai" } },
    { type: "ports", id: "p2", attributes: { name: "Los Angeles" } },
    { type: "terminals", id: "t1", attributes: { name: "APM Terminals Los Angeles" } },
    {
      type: "containers",
      id: "c1",
      attributes: {
        number: "MSKU1234567",
        equipment_type: "dry",
        equipment_length: 40,
        equipment_height: "high_cube",
        available_for_pickup: false,
        pickup_lfd: "2026-11-09T23:59:00Z",
        holds_at_pod_terminal: [
          { name: "customs", status: "hold", description: "CBP exam hold" },
          { name: "freight", status: "hold", description: null },
        ],
        fees_at_pod_terminal: [
          { type: "demurrage", amount: 250, currency_code: "USD" },
          { type: "total", amount: 250, currency_code: "USD" },
        ],
      },
      relationships: {
        pod_terminal: { data: { type: "terminals", id: "t1" } },
        transport_events: { data: [{ type: "transport_events", id: "e1" }, { type: "transport_events", id: "e2" }] },
      },
    },
    {
      type: "containers",
      id: "c2",
      attributes: {
        number: "TCLU7654321",
        available_for_pickup: true,
        pickup_lfd: "2026-11-10T23:59:00Z",
        holds_at_pod_terminal: [],
        fees_at_pod_terminal: [],
      },
      relationships: {
        pod_terminal: { data: { type: "terminals", id: "t1" } },
        transport_events: { data: [{ type: "transport_events", id: "e1" }, { type: "transport_events", id: "e2" }] },
      },
    },
    { type: "transport_events", id: "e1", attributes: { event: "vessel_arrived", timestamp: "2026-11-04T08:00:00Z", location: "Los Angeles" } },
    { type: "transport_events", id: "e2", attributes: { event: "container_discharge_from_vessel", timestamp: "2026-11-04T20:00:00Z", location: "Los Angeles" } },
  ],
};

const { shipment, containers } = normalizeShipmentDoc(docWithHolds);
check("shipment MBL", shipment.bill_of_lading_number === "MAEU123456789");
check("shipment line name", shipment.shipping_line === "Maersk");
check("shipment POL/POD", shipment.pol === "Shanghai" && shipment.pod === "Los Angeles");
check("shipment arrived_at from events", shipment.arrived_at === "2026-11-04T08:00:00Z", shipment.arrived_at);
check("two containers", containers.length === 2);

const c1 = containers.find((c) => c.container_number === "MSKU1234567")!;
check("c1 customs hold", c1.customs_state === "hold" && c1.customs_holds.length === 1);
check("c1 carrier hold (freight)", c1.carrier_state === "hold" && c1.carrier_holds.length === 1);
check("c1 not pickup ready", c1.pickup_ready === false);
check("c1 LFD", c1.last_free_day === "2026-11-09T23:59:00Z");
check("c1 fees kept", c1.fees.length === 2 && c1.fees[0].amount === 250);
check("c1 terminal", c1.terminal === "APM Terminals Los Angeles");
check("c1 equipment", c1.equipment === "40ft high_cube dry");

const c2 = containers.find((c) => c.container_number === "TCLU7654321")!;
check("c2 customs released", c2.customs_state === "released", c2.customs_state);
check("c2 carrier released", c2.carrier_state === "released", c2.carrier_state);
check("c2 pickup ready", c2.pickup_ready === true);
check("c2 events sorted", c2.events.length === 2 && c2.events[0].event === "vessel_arrived");

/* No terminal feed + not discharged => states must stay unknown, never released. */
const docNoFeed: any = {
  data: {
    type: "shipments",
    id: "shp-2",
    attributes: { bill_of_lading_number: "OOLU999888777" },
    relationships: { containers: { data: [{ type: "containers", id: "c9" }] } },
  },
  included: [
    { type: "containers", id: "c9", attributes: { number: "OOLU1112223" }, relationships: {} },
  ],
};
const r2 = normalizeShipmentDoc(docNoFeed);
check("no-feed customs unknown", r2.containers[0].customs_state === "unknown", r2.containers[0].customs_state);
check("no-feed carrier unknown", r2.containers[0].carrier_state === "unknown");
check("no-feed terminal_supported false", r2.containers[0].terminal_supported === false);
check("no-feed pickup_ready null", r2.containers[0].pickup_ready === null);

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
