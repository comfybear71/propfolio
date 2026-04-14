"use client";

import { useState, useEffect } from "react";

export default function ShareButton() {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open && token === null) {
      // Fetch existing token
      fetch("/api/share")
        .then((r) => r.json())
        .then((d) => {
          if (d.ok && d.token) setToken(d.token);
        });
    }
  }, [open, token]);

  async function createOrRotate() {
    setLoading(true);
    const res = await fetch("/api/share", { method: "POST" });
    const d = await res.json();
    if (d.ok) setToken(d.token);
    setLoading(false);
  }

  async function revoke() {
    if (!confirm("Revoke the share link? The broker will lose access.")) return;
    setLoading(true);
    await fetch("/api/share", { method: "DELETE" });
    setToken(null);
    setLoading(false);
  }

  function copyLink() {
    if (!token) return;
    const url = `${window.location.origin}/share/${token}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const shareUrl = token ? `${typeof window !== "undefined" ? window.location.origin : ""}/share/${token}` : "";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-sm px-3 py-1.5 rounded-lg border border-[var(--card-border)] hover:border-[var(--accent)] text-[var(--muted)] hover:text-[var(--accent)] transition-colors"
      >
        Share with Broker
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-6 max-w-md w-full space-y-4"
          >
            <div className="flex justify-between items-start">
              <h3 className="font-semibold text-lg">Share with Broker or Bank</h3>
              <button
                onClick={() => setOpen(false)}
                className="text-[var(--muted)] hover:text-white text-xl leading-none"
              >
                &times;
              </button>
            </div>

            <p className="text-sm text-[var(--muted)]">
              Create a read-only link to share your portfolio with your broker or bank.
              They&apos;ll see your properties, loans, income, assets, and document list —
              but they can&apos;t modify anything.
            </p>

            {!token && (
              <button
                onClick={createOrRotate}
                disabled={loading}
                className="w-full px-4 py-3 bg-[var(--accent)] text-white rounded-lg font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-40"
              >
                {loading ? "Creating link..." : "Create Share Link"}
              </button>
            )}

            {token && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-[var(--muted)] mb-1 block">Your Share Link</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={shareUrl}
                      readOnly
                      className="flex-1 bg-[var(--background)] border border-[var(--card-border)] rounded px-3 py-2 text-xs font-mono text-[var(--muted)]"
                    />
                    <button
                      onClick={copyLink}
                      className="px-3 py-2 bg-[var(--accent)] text-white rounded text-xs font-medium hover:bg-[var(--accent-hover)] transition-colors shrink-0"
                    >
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>
                <div className="text-xs text-[var(--muted)] bg-[var(--background)] rounded p-3">
                  <div className="font-medium mb-1">What they&apos;ll see:</div>
                  <ul className="space-y-0.5 list-disc ml-4">
                    <li>Property values, equity, rental income</li>
                    <li>Loan balances, rates, offset</li>
                    <li>Combined income summary</li>
                    <li>Assets and savings</li>
                    <li>Document list (not the files themselves)</li>
                  </ul>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={createOrRotate}
                    disabled={loading}
                    className="flex-1 px-3 py-2 border border-[var(--card-border)] text-[var(--muted)] hover:text-white rounded text-sm transition-colors"
                  >
                    Rotate Link
                  </button>
                  <button
                    onClick={revoke}
                    disabled={loading}
                    className="flex-1 px-3 py-2 border border-[var(--negative)]/30 text-[var(--negative)] hover:bg-[var(--negative)]/10 rounded text-sm transition-colors"
                  >
                    Revoke Access
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
