"use client";

import * as React from "react";
import { toast } from "sonner";

import {
  deleteIngestProducts,
  getIngest,
  getIngestProducts,
  postIngest,
  postIngestCancel,
  postIngestProducts,
  putIngestProducts,
  type IngestRequest,
  type PatchedProductWrite,
  type Product,
  type ProductWrite,
} from "@/src/client";
import { API_BASE, describeApiError } from "@/lib/api";

/**
 * The `progress` / `done` SSE payload. Not in `types.gen.ts`: the stream's 200 is typed
 * `string` (a `text/event-stream` body), so the event shapes live only in the endpoint's
 * description — see `getIngestStream`'s JSDoc, which this mirrors field for field.
 */
export type IngestProgress = {
  job: string;
  status: string;
  processed: number;
  total: number;
  created: number;
  updated: number;
  skipped: number;
};

/** `running` is ours: the socket is open. The rest are the job's own status strings. */
export type IngestStatus =
  | "loading"
  | "idle"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled";

const OFFLINE = "Could not reach the server. Check your connection and try again.";

/** A screenful and a bit, since the list now pages itself on scroll rather than on a click. */
const PAGE_SIZE = 20;

/**
 * The whole catalogue screen: hydrate, start, stream, and the merchant's own edits.
 *
 * Two requests on mount, not one. `GET /ingest/` carries the merchant's domain, their MCP
 * address and the in-flight job if there is one — so a reload during a scan rejoins the same
 * stream rather than showing a table that has quietly stopped filling. The catalogue itself
 * comes from the paginated `GET /ingest/products`. They are kept as separate promises on
 * purpose: `/ingest/` 404s for a buyer, or for a merchant row that was never created, and
 * that must not blank a product list which loaded perfectly well.
 */
export function useIngest() {
  const [products, setProducts] = React.useState<Product[]>([]);
  // Whether another page exists, taken from the envelope's own `next` link rather than
  // derived from `count - products.length`. Those two disagree the moment the list shifts
  // under us — a delete drops `count` but the deduped page also drops a row, so the
  // difference can sit at a permanent 1 and the scroll sentinel asks forever for a page
  // the server answers 404 to. `next` is the server's answer to the same question.
  const [hasMore, setHasMore] = React.useState(false);
  const [progress, setProgress] = React.useState<IngestProgress | null>(null);
  const [status, setStatus] = React.useState<IngestStatus>("loading");
  const [busy, setBusy] = React.useState(false);
  const [merchant, setMerchant] = React.useState<{ domain: string; mcpUrl: string | null }>({
    domain: "",
    mcpUrl: null,
  });

  // The live connection, so `start()` can replace one and unmount can close it. A ref,
  // not state: nothing renders from it, and re-rendering on connect would be a wasted pass.
  const source = React.useRef<EventSource | null>(null);
  // The job the open stream belongs to, so `cancel()` has a uuid to address. A ref for the
  // same reason: `status === "running"` is what renders the Stop button, not this.
  const job = React.useRef<string | null>(null);
  // Likewise the page we are on. Nothing reads it during a render — only `loadMore`
  // does, and a ref keeps it out of every callback's dependency list.
  const page = React.useRef(1);

  /**
   * One page of the catalogue. A promise chain rather than async/await, and it sets no
   * state of its own: the mount effect calls this, and `react-hooks/set-state-in-effect`
   * counts every setState it can reach synchronously through a callback — an `await` in
   * between does not clear it, a `.then` boundary does. `busy` is `loadMore`'s job for the
   * same reason; the first page needs no spinner anyway, since `status` is already
   * `"loading"` until the screen resolves.
   */
  const load = React.useCallback(
    (next: number) =>
      getIngestProducts({ query: { page: next, page_size: PAGE_SIZE } })
        .then(({ data, error }) => {
          if (!data) {
            // Stop paging. `page.current` did not advance, so leaving the sentinel armed
            // would re-request the page that just failed on the very next intersection.
            setHasMore(false);
            return toast.error(describeApiError(error));
          }
          page.current = next;
          setHasMore(data.next != null);
          // Page numbers over a list that shifts: a delete (or a streamed prepend) moves
          // every row back or forward one, so the next page re-serves a row already held.
          // Dedupe on `uuid` here rather than at each caller — this is the one place a page
          // is appended. Keep the row we have; the new copy is the same row, one slot over.
          setProducts((rows) => {
            if (next === 1) return data.results;
            // `uuid` is optional on the wire, so a blank one identifies nothing — those
            // rows pass through rather than collapsing into one.
            const seen = new Set(rows.map((row) => row.uuid).filter(Boolean));
            return [...rows, ...data.results.filter((row) => !row.uuid || !seen.has(row.uuid))];
          });
        })
        .catch(() => toast.error(OFFLINE)),
    []
  );

  const open = React.useCallback(
    (jobUuid: string, streamUrl: string) => {
      source.current?.close();
      job.current = jobUuid;
      // withCredentials, or the sessionid cookie is not sent and the stream 401s. This is
      // EventSource's own flag — the fetch client's `credentials: "include"` is unrelated.
      const es = new EventSource(API_BASE + streamUrl, { withCredentials: true });
      source.current = es;
      setStatus("running");

      const close = () => {
        es.close();
        if (source.current === es) source.current = null;
      };

      es.addEventListener("progress", (event) => {
        setProgress(JSON.parse(event.data));
      });

      es.addEventListener("product", (event) => {
        const product: Product = JSON.parse(event.data);
        // Newest first, deduplicated on `uuid` — the row identity the API now hands back,
        // and the key its edit and delete are addressed by. Not `sku`, which is blank for
        // any page that published none, and no longer `url`, which the list shape dropped.
        setProducts((rows) => [product, ...rows.filter((row) => row.uuid !== product.uuid)]);
      });

      es.addEventListener("done", (event) => {
        const final: IngestProgress = JSON.parse(event.data);
        setProgress(final);
        close();
        // A cancelled run ends with `done` too — the job settles on `cancelled` and the
        // stream closes normally. It is not a failure and not a success: the rows already
        // read are kept, which is what the toast has to say.
        const stopped = final.status === "cancelled";
        setStatus(stopped ? "cancelled" : "succeeded");
        const kept = `${final.created} new, ${final.updated} updated.`;
        if (stopped) toast.info(`Scan stopped. Kept ${kept}`);
        else
          toast.success(
            final.created || final.updated ? `Scan finished. ${kept}` : "Scan finished."
          );
        // A rescan emits no `product` event for a row that already existed — the backend
        // signal fires on create only, to stay aligned with `created_count` — so refetching
        // page one is the only way an updated price reaches the table. It drops any extra
        // pages the merchant had loaded, which is honest: the ordering just changed.
        load(1);
      });

      es.addEventListener("error", (event) => {
        // Two different failures share this name. A MessageEvent with data is the server
        // saying the *job* failed, and its message is written for a merchant to read. No
        // data means the *connection* dropped, which says nothing about the job.
        const data = (event as MessageEvent).data;
        close();
        if (typeof data === "string" && data) {
          setStatus("failed");
          toast.error(JSON.parse(data).message ?? "The scan failed.");
        } else {
          setStatus("idle");
          toast.warning("Lost the connection to the scan. Reload to pick it back up.");
        }
      });
    },
    [load]
  );

  React.useEffect(() => {
    let active = true;
    load(1);
    getIngest()
      .then(({ data, error }) => {
        if (!active) return;
        if (!data) {
          // 404 here means a buyer, or a merchant row that was never created. Silent:
          // the page renders its "nothing scanned yet" state, which is the truth.
          setStatus("idle");
          if (error) toast.error(describeApiError(error));
          return;
        }
        setMerchant({ domain: data.domain, mcpUrl: data.mcp_url });
        if (data.job && data.stream_url) open(data.job, data.stream_url);
        else setStatus("idle");
      })
      .catch(() => {
        if (!active) return;
        setStatus("idle");
        toast.error(OFFLINE);
      });

    return () => {
      active = false;
      source.current?.close();
      source.current = null;
    };
  }, [open, load]);

  const start = React.useCallback(
    async (body: IngestRequest) => {
      setProgress(null);
      const id = toast.loading("Reading your storefront…");
      try {
        // Idempotent while a job is PENDING or RUNNING — the view hands back the
        // existing one — so a double submit cannot start two crawls.
        const { data, error } = await postIngest({ body });
        if (!data) return toast.error(describeApiError(error), { id });
        setMerchant((current) => ({ ...current, mcpUrl: data.mcp_url }));
        open(data.job, data.stream_url);
        toast.success("Scan started. Products appear as they are read.", { id });
      } catch {
        toast.error(OFFLINE, { id });
      }
    },
    [open]
  );

  /**
   * Stop the run in flight. Nothing is set here on the way out: the server closes the stream
   * with a final `done` carrying `status: "cancelled"`, and that handler above is the single
   * place the screen leaves `running` — so a cancel that races a job finishing on its own
   * cannot report a stop that did not happen. `cancelled: false` is exactly that race, and
   * the endpoint is idempotent, so a second click is safe.
   */
  const cancel = React.useCallback(async () => {
    const uuid = job.current;
    if (!uuid) return;
    const id = toast.loading("Stopping the scan…");
    try {
      const { data, error } = await postIngestCancel({ path: { job_uuid: uuid } });
      if (!data) return toast.error(describeApiError(error), { id });
      if (data.cancelled) toast.info("Stopping. Products already read are kept.", { id });
      else toast.info("The scan had already finished.", { id });
    } catch {
      toast.error(OFFLINE, { id });
    }
  }, []);

  // The three writes. No optimism: create and update both return the saved row, so the
  // table shows what the server stored rather than what the form guessed. Each answers
  // whether it landed, because the dialog only closes on a write that actually happened.

  const create = React.useCallback(async (body: ProductWrite) => {
    setBusy(true);
    try {
      const { data, error } = await postIngestProducts({ body });
      if (!data) {
        toast.error(describeApiError(error));
        return false;
      }
      setProducts((rows) => [data, ...rows.filter((row) => row.uuid !== data.uuid)]);
      toast.success("Product added.");
      return true;
    } catch {
      toast.error(OFFLINE);
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const update = React.useCallback(async (uuid: string, body: PatchedProductWrite) => {
    setBusy(true);
    try {
      const { data, error } = await putIngestProducts({ path: { product_uuid: uuid }, body });
      if (!data) {
        toast.error(describeApiError(error));
        return false;
      }
      setProducts((rows) => rows.map((row) => (row.uuid === uuid ? data : row)));
      toast.success("Product updated.");
      return true;
    } catch {
      toast.error(OFFLINE);
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const remove = React.useCallback(async (uuid: string) => {
    setBusy(true);
    try {
      // A 204 with no body, so `error` is the only signal — `data` is undefined either way.
      const { error } = await deleteIngestProducts({ path: { product_uuid: uuid } });
      if (error) {
        toast.error(describeApiError(error));
        return false;
      }
      setProducts((rows) => rows.filter((row) => row.uuid !== uuid));
      toast.success("Product deleted.");
      return true;
    } catch {
      toast.error(OFFLINE);
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const loadMore = React.useCallback(async () => {
    setBusy(true);
    await load(page.current + 1);
    setBusy(false);
  }, [load]);

  return {
    products,
    hasMore,
    progress,
    status,
    busy,
    merchant,
    start,
    cancel,
    loadMore,
    create,
    update,
    remove,
  };
}
