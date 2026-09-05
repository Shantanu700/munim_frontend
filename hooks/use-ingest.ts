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

export type IngestProgress = {
  job: string;
  status: string;
  processed: number;
  total: number;
  created: number;
  updated: number;
  skipped: number;
};

export type IngestStatus =
  | "loading"
  | "idle"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled";

const OFFLINE = "Could not reach the server. Check your connection and try again.";

const PAGE_SIZE = 20;

export function useIngest() {
  const [products, setProducts] = React.useState<Product[]>([]);
  const [hasMore, setHasMore] = React.useState(false);
  const [progress, setProgress] = React.useState<IngestProgress | null>(null);
  const [status, setStatus] = React.useState<IngestStatus>("loading");
  const [busy, setBusy] = React.useState(false);
  const [merchant, setMerchant] = React.useState<{ domain: string; mcpUrl: string | null }>({
    domain: "",
    mcpUrl: null,
  });

  const source = React.useRef<EventSource | null>(null);
  const job = React.useRef<string | null>(null);
  const page = React.useRef(1);

  const load = React.useCallback(
    (next: number) =>
      getIngestProducts({ query: { page: next, page_size: PAGE_SIZE } })
        .then(({ data, error }) => {
          if (!data) {
            setHasMore(false);
            return toast.error(describeApiError(error));
          }
          page.current = next;
          setHasMore(data.next != null);
          setProducts((rows) => {
            if (next === 1) return data.results;
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
        setProducts((rows) => [product, ...rows.filter((row) => row.uuid !== product.uuid)]);
      });

      es.addEventListener("done", (event) => {
        const final: IngestProgress = JSON.parse(event.data);
        setProgress(final);
        close();
        const stopped = final.status === "cancelled";
        setStatus(stopped ? "cancelled" : "succeeded");
        const kept = `${final.created} new, ${final.updated} updated.`;
        if (stopped) toast.info(`Scan stopped. Kept ${kept}`);
        else
          toast.success(
            final.created || final.updated ? `Scan finished. ${kept}` : "Scan finished."
          );
        load(1);
      });

      es.addEventListener("error", (event) => {
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
