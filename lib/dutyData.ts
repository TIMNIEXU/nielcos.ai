/* Shared reference-table loader for the duty engine.
   PostgREST caps a single response (default 1000 rows). additional_duties
   has 10k+ rows since customs_v10 and hts_schedule ~19k — a plain
   .select("*") silently drops everything past row 1000. Always paginate.
   Tables are reference data (only change when a migration is run), so a
   short in-memory TTL cache is safe and keeps warm responses fast. */

type RangeResult = { data: unknown[] | null; error: unknown };
// Minimal structural shape: satisfied by the real SupabaseClient and by
// loose wrappers like the assistant engine's Sb. (PostgREST builders are
// thenable but not real Promises, hence PromiseLike, not Promise.)
type SbLike = {
  from: (table: string) => {
    select: (columns: string) => {
      range: (from: number, to: number) => PromiseLike<RangeResult>;
    };
  };
};

const cache = new Map<string, { at: number; rows: unknown[] }>();
const TTL_MS = 5 * 60 * 1000;
const PAGE = 1000;

async function fetchAll(sb: SbLike, table: string, columns: string): Promise<unknown[]> {
  const out: unknown[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await sb.from(table).select(columns).range(from, from + PAGE - 1);
    if (error) throw error;
    const rows = (data ?? []) as unknown[];
    out.push(...rows);
    if (rows.length < PAGE) break;
    from += PAGE;
    if (from > 100000) break; // sanity cap
  }
  return out;
}

export async function fetchRefTable<T>(sb: SbLike, table: string, columns: string): Promise<T[]> {
  const key = `${table}::${columns}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.rows as T[];
  const rows = await fetchAll(sb, table, columns);
  cache.set(key, { at: Date.now(), rows });
  return rows as T[];
}
