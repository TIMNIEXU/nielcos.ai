// pdf.js worker module has no bundled types; the parse route only needs its
// side effect (it sets globalThis.pdfjsWorker on import).
declare module "pdfjs-dist/legacy/build/pdf.worker.mjs" {
  export const WorkerMessageHandler: any;
}
