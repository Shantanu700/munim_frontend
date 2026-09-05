"use client";

import * as React from "react";
import { toast } from "sonner";

import { CopyButton } from "@/components/dashboard/copy-button";
import { PanelHeader, Row, mask, moment } from "@/components/dashboard/parts";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useApiKeys } from "@/hooks/use-api-keys";
import { cn } from "@/lib/utils";
import type { PlatformApiKey, PlatformApiKeyIssued } from "@/src/client";

const FIELD =
  "flex h-11 items-center gap-2 rounded-full bg-navy-200/12 px-4 text-body focus-within:ring-3 focus-within:ring-navy-200/40";
const INPUT =
  "min-w-0 flex-1 bg-transparent text-body outline-none placeholder:text-navy-200/60";
const LABEL = "px-1 text-eyebrow uppercase text-navy-200";

const ON_NAVY = "bg-navy-200 text-navy-900 hover:bg-navy-200/85";

const MCP_URL = process.env.NEXT_PUBLIC_MCP_URL;

function StatePill({ revoked }: { revoked: boolean }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2.5 py-1 text-meta font-medium",
        revoked ? "bg-deny-tint text-deny" : "bg-allow-tint text-allow"
      )}
    >
      {revoked ? "Revoked" : "Active"}
    </span>
  );
}

function RevokeButton({
  uuid,
  name,
  busy,
  revoke,
}: {
  uuid: string;
  name: string;
  busy: boolean;
  revoke: (uuid: string) => Promise<boolean>;
}) {
  const [open, setOpen] = React.useState(false);

  async function confirm() {
    await revoke(uuid);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" disabled={busy} className="shrink-0">
          Revoke
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="shadow-card ring-0">
        <PopoverHeader>
          <PopoverTitle className="text-card-title">Revoke this key?</PopoverTitle>
          <PopoverDescription className="max-w-none text-meta text-muted-ink">
            Anything using {name} stops reaching Munim immediately. This cannot be undone — the
            key was only ever shown once, so create a new one to restore access.
          </PopoverDescription>
        </PopoverHeader>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={confirm}>
            Revoke
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function KeyRow({
  apiKey,
  busy,
  revoke,
}: {
  apiKey: PlatformApiKey;
  busy: boolean;
  revoke: (uuid: string) => Promise<boolean>;
}) {
  const name = apiKey.name || "Unnamed key";
  const revoked = Boolean(apiKey.revoked_at);

  return (
    <Row className="flex flex-wrap items-center gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2.5">
          <span className="truncate text-body font-medium">{name}</span>
          <StatePill revoked={revoked} />
        </div>
        <div className="mt-1 text-meta text-muted-ink">
          <code className="tabular-nums">{apiKey.prefix}…</code> · created{" "}
          {moment(apiKey.created_at)} ·{" "}
          {apiKey.last_used_at ? `last used ${moment(apiKey.last_used_at)}` : "never used"}
          {apiKey.revoked_at ? ` · revoked ${moment(apiKey.revoked_at)}` : ""}
        </div>
      </div>
      {!revoked && apiKey.uuid ? (
        <RevokeButton uuid={apiKey.uuid} name={name} busy={busy} revoke={revoke} />
      ) : null}
    </Row>
  );
}

export function ApiKeysScreen() {
  const { keys, loading, busy, create, revoke } = useApiKeys();
  const [name, setName] = React.useState("");
  const [issued, setIssued] = React.useState<PlatformApiKeyIssued | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      toast.error("Name the key so you can tell it apart later.");
      return;
    }
    const result = await create(name.trim());
    if (!result) return;
    setIssued(result);
    setName("");
  }

  return (
    <div className="grid gap-panel">
      <div className="px-1.5 py-1">
        <h1 className="text-page-title">API keys</h1>
        <p className="mt-1.5 max-w-none text-body text-muted-ink">
          Keys your own tools use to reach Munim. Each one is shown once when you create it and
          never again — Munim stores only its hash. Revoke any of them at any time.
        </p>
      </div>

      <Dialog open={issued !== null} onOpenChange={(open) => !open && setIssued(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Key created</DialogTitle>
            <DialogDescription>
              Store {issued?.name} somewhere your tools can read it. Copy it now — Munim cannot
              show it to you again. If you lose it, revoke the key and create a new one.
            </DialogDescription>
          </DialogHeader>
          <code className="block truncate rounded-md bg-panel-2 px-4 py-3 text-dense tabular-nums">
            {issued ? mask(issued.key) : null}
          </code>
          <p className="max-w-none text-meta text-muted-ink">
            Only the ends are shown. Copy takes the whole key.
          </p>
          <DialogFooter>
            <CopyButton
              value={issued?.key ?? ""}
              copiedLabel="Key copied."
              className="h-10 w-full sm:w-auto"
            >
              Copy key
            </CopyButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid items-start gap-panel lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="rounded-xl bg-panel p-6 shadow-card">
          <PanelHeader title="Your keys" meta={keys.length || undefined} />
          <div className="mt-3.5 grid gap-2.5">
            {loading ? (
              <p className="text-body text-muted-ink">Loading…</p>
            ) : keys.length === 0 ? (
              <p className="text-body text-muted-ink">
                No keys yet. Create one to let your own tools reach Munim on your behalf.
              </p>
            ) : (
              keys.map((apiKey) => (
                <KeyRow
                  key={apiKey.uuid ?? apiKey.prefix}
                  apiKey={apiKey}
                  busy={busy}
                  revoke={revoke}
                />
              ))
            )}
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl bg-navy-900 p-6 text-navy-050 shadow-card"
        >
          <PanelHeader title="Create a key" />
          <p className="mt-1.5 max-w-none text-body text-navy-200">
            Name it after whatever will hold it, so revoking the right one later is obvious.
          </p>
          <label className="mt-6 grid gap-1.5">
            <span className={LABEL}>Name</span>
            <span className={FIELD}>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Laptop CLI"
                aria-label="Key name"
                className={INPUT}
              />
            </span>
          </label>
          <Button type="submit" disabled={busy} className={cn("mt-6 h-11 w-full", ON_NAVY)}>
            {busy ? "Working…" : "Create key"}
          </Button>
          {MCP_URL ? (
            <div className="mt-6 border-t border-navy-200/20 pt-4">
              <div className={LABEL}>MCP endpoint</div>
              <div className="mt-1.5 flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate text-meta text-navy-200">
                  {MCP_URL}
                </code>
                <CopyButton
                  value={MCP_URL}
                  size="sm"
                  aria-label="Copy the MCP endpoint to the clipboard"
                  copiedLabel="Endpoint copied."
                  className={cn("h-8 shrink-0 px-3", ON_NAVY)}
                >
                  Copy
                </CopyButton>
              </div>
            </div>
          ) : null}
        </form>
      </div>
    </div>
  );
}
