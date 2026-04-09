"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface Document {
  id: string;
  category: string;
  name: string;
  description: string;
  status: "missing" | "have" | "expired" | "requested" | "n/a";
  notes: string;
  lastUpdated: string;
  forPerson: "Stuart" | "Sasitron" | "Both" | "Property";
}

const documentCategories = [
  {
    name: "Identity & Personal",
    icon: "ID",
    docs: [
      { name: "Photo ID (Drivers Licence)", description: "Current and not expired", forPerson: "Both" as const },
      { name: "Passport", description: "Current passport or certified copy", forPerson: "Both" as const },
      { name: "Medicare Card", description: "Current Medicare card", forPerson: "Both" as const },
      { name: "Birth Certificate / Citizenship", description: "Proof of Australian citizenship or residency", forPerson: "Both" as const },
    ],
  },
  {
    name: "Income & Employment",
    icon: "Pay",
    docs: [
      { name: "Latest 2 payslips", description: "Most recent consecutive payslips showing YTD", forPerson: "Both" as const },
      { name: "Employment letter / contract", description: "Confirming role, salary, and employment type", forPerson: "Both" as const },
      { name: "Tax return (latest)", description: "Latest ATO tax return / Notice of Assessment", forPerson: "Both" as const },
      { name: "Tax return (previous year)", description: "Previous year's ATO tax return / NOA", forPerson: "Both" as const },
      { name: "Rental income evidence", description: "Lease agreements, property manager statements", forPerson: "Both" as const },
      { name: "Group Certificate / PAYG Summary", description: "Annual income summary from employer", forPerson: "Both" as const },
    ],
  },
  {
    name: "Assets & Savings",
    icon: "Bank",
    docs: [
      { name: "Bank statements (3 months)", description: "All transaction accounts showing savings pattern", forPerson: "Both" as const },
      { name: "Offset account statements", description: "Current offset account balance and history", forPerson: "Sasitron" as const },
      { name: "Superannuation statement", description: "Latest super balance statement", forPerson: "Both" as const },
      { name: "Share portfolio / investments", description: "Any managed funds, shares, crypto holdings", forPerson: "Both" as const },
      { name: "Vehicle registration", description: "Proof of vehicle ownership and value", forPerson: "Both" as const },
    ],
  },
  {
    name: "Existing Properties",
    icon: "Home",
    docs: [
      { name: "60 Bagshaw - Title deed", description: "Certificate of Title", forPerson: "Stuart" as const },
      { name: "60 Bagshaw - Mortgage statement", description: "Latest home loan statement", forPerson: "Stuart" as const },
      { name: "60 Bagshaw - Council rates notice", description: "Latest rates notice from council", forPerson: "Stuart" as const },
      { name: "60 Bagshaw - Insurance certificate", description: "Home & contents / landlord insurance", forPerson: "Stuart" as const },
      { name: "60 Bagshaw - Rental agreements", description: "Room rental agreements with tenants", forPerson: "Stuart" as const },
      { name: "72 Bagshaw - Title deed", description: "Certificate of Title", forPerson: "Sasitron" as const },
      { name: "72 Bagshaw - Mortgage statement", description: "Latest home loan statement from ING", forPerson: "Sasitron" as const },
      { name: "72 Bagshaw - Lease agreement", description: "Current tenant lease agreement", forPerson: "Sasitron" as const },
      { name: "72 Bagshaw - Property manager statement", description: "Rental income statements from agent", forPerson: "Sasitron" as const },
      { name: "72 Bagshaw - Council rates notice", description: "Latest rates notice from council", forPerson: "Sasitron" as const },
      { name: "72 Bagshaw - Insurance certificate", description: "Landlord insurance policy", forPerson: "Sasitron" as const },
      { name: "72 Bagshaw - Depreciation schedule", description: "Tax depreciation schedule from quantity surveyor", forPerson: "Sasitron" as const },
    ],
  },
  {
    name: "Liabilities & Commitments",
    icon: "Debt",
    docs: [
      { name: "Credit card statements", description: "All credit cards — latest statements showing limits", forPerson: "Both" as const },
      { name: "Personal loan statements", description: "Any personal loans, car loans, BNPL", forPerson: "Both" as const },
      { name: "HECS-HELP statement", description: "Outstanding HECS/HELP debt balance", forPerson: "Both" as const },
      { name: "Child support / maintenance", description: "Any ongoing support obligations", forPerson: "Both" as const },
    ],
  },
  {
    name: "Living Expenses",
    icon: "Bills",
    docs: [
      { name: "Monthly expense breakdown", description: "Detailed living expenses (use Propfolio Finances page)", forPerson: "Both" as const },
      { name: "Health insurance statement", description: "Private health cover details", forPerson: "Both" as const },
      { name: "Childcare / school fees", description: "Any education costs", forPerson: "Both" as const },
    ],
  },
  {
    name: "New Purchase (when ready)",
    icon: "New",
    docs: [
      { name: "Contract of Sale", description: "Signed contract for the property being purchased", forPerson: "Property" as const },
      { name: "Building & pest report", description: "Pre-purchase inspection reports", forPerson: "Property" as const },
      { name: "Valuation report", description: "Bank-ordered or independent valuation", forPerson: "Property" as const },
      { name: "Builder quote / fixed price contract", description: "For new builds — construction costs breakdown", forPerson: "Property" as const },
      { name: "NT BuildBonus grant application", description: "$30,000 NT Government grant for new builds", forPerson: "Property" as const },
      { name: "Council / planning approvals", description: "Development approval if building", forPerson: "Property" as const },
    ],
  },
];

function createDefaultDocuments(): Document[] {
  const docs: Document[] = [];
  let id = 1;
  for (const cat of documentCategories) {
    for (const doc of cat.docs) {
      docs.push({
        id: String(id++),
        category: cat.name,
        name: doc.name,
        description: doc.description,
        status: "missing",
        notes: "",
        lastUpdated: "",
        forPerson: doc.forPerson,
      });
    }
  }
  return docs;
}

interface FileRecord {
  documentId: string;
  filename: string;
  originalName: string;
  url: string;
  size: number;
  category: string;
  person: string;
  uploadedAt: string;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [filterPerson, setFilterPerson] = useState<string>("All");
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [uploading, setUploading] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<{ docId: string; data: Record<string, unknown> } | null>(null);
  const [ocrLoading, setOcrLoading] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(null);

  const saveDocuments = useCallback(async (docs: Document[]) => {
    await fetch("/api/documents", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(docs),
    }).catch(() => {});
  }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/documents").then((r) => r.json()).catch(() => []),
      fetch("/api/files").then((r) => r.json()).catch(() => []),
    ]).then(([docs, fileList]) => {
      if (docs.length > 0) setDocuments(docs);
      else setDocuments(createDefaultDocuments());
      if (Array.isArray(fileList)) setFiles(fileList);
      setLoaded(true);
    });
  }, []);

  function updateDoc(id: string, field: keyof Document, value: string) {
    const updated = documents.map((d) =>
      d.id === id
        ? { ...d, [field]: value, lastUpdated: field === "status" ? new Date().toISOString().split("T")[0] : d.lastUpdated }
        : d
    );
    setDocuments(updated);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveDocuments(updated), 1000);
  }

  function resetAll() {
    const defaults = createDefaultDocuments();
    setDocuments(defaults);
    saveDocuments(defaults);
  }

  async function uploadFile(documentId: string, category: string, person: string, file: File) {
    setUploading(documentId);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("documentId", documentId);
    formData.append("category", category);
    formData.append("person", person);

    try {
      const res = await fetch("/api/files", { method: "POST", body: formData });
      const data = await res.json();
      if (data.ok) {
        const updated = await fetch("/api/files").then((r) => r.json());
        if (Array.isArray(updated)) setFiles(updated);
        updateDoc(documentId, "status", "have");

        // Auto-OCR for all document types (images and PDFs)
        const isReadable = file.type.startsWith("image/") || file.type === "application/pdf";
        if (isReadable) {
          setOcrLoading(documentId);
          try {
            const ocrForm = new FormData();
            ocrForm.append("file", file);
            ocrForm.append("category", category);
            const ocrRes = await fetch("/api/ocr-document", { method: "POST", body: ocrForm });
            const ocrData = await ocrRes.json();
            if (ocrData.ok && ocrData.data) {
              setOcrResult({ docId: documentId, data: ocrData.data });
            }
          } catch { /* OCR is optional */ }
          setOcrLoading(null);
        }
      }
    } catch (e) {
      console.error("Upload failed:", e);
    }
    setUploading(null);
  }

  async function deleteFile(url: string, documentId: string) {
    await fetch("/api/files", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, documentId }),
    });
    setFiles((prev) => prev.filter((f) => !(f.url === url && f.documentId === documentId)));
  }

  function getFilesForDoc(documentId: string) {
    return files.filter((f) => f.documentId === documentId);
  }

  function formatFileSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  const totalDocs = documents.length;
  const haveDocs = documents.filter((d) => d.status === "have").length;
  const missingDocs = documents.filter((d) => d.status === "missing").length;
  const expiredDocs = documents.filter((d) => d.status === "expired").length;
  const requestedDocs = documents.filter((d) => d.status === "requested").length;
  const readyPercent = totalDocs > 0 ? ((haveDocs / totalDocs) * 100).toFixed(0) : "0";

  const filteredCategories = documentCategories.map((cat) => ({
    ...cat,
    docs: cat.docs.filter((_, i) => {
      const doc = documents.find((d) => d.category === cat.name && d.name === cat.docs[i]?.name);
      if (!doc) return true;
      if (filterPerson !== "All" && doc.forPerson !== filterPerson && doc.forPerson !== "Both") return false;
      if (filterStatus !== "All" && doc.status !== filterStatus) return false;
      return true;
    }),
  }));

  if (!loaded) return null;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-1">Document Vault</h2>
        <p className="text-[var(--muted)]">
          Everything your broker and bank will need — track what you have and what&apos;s missing
        </p>
      </div>

      {/* Readiness Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4">
          <div className="text-[var(--muted)] text-xs mb-1">Broker Ready</div>
          <div className="text-2xl font-bold text-[var(--accent)]">{readyPercent}%</div>
          <div className="w-full bg-[var(--card-border)] rounded-full h-1.5 mt-2">
            <div className="bg-[var(--accent)] h-1.5 rounded-full" style={{ width: `${readyPercent}%` }} />
          </div>
        </div>
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4">
          <div className="text-[var(--muted)] text-xs mb-1">Have</div>
          <div className="text-2xl font-bold text-[var(--positive)]">{haveDocs}</div>
        </div>
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4">
          <div className="text-[var(--muted)] text-xs mb-1">Missing</div>
          <div className="text-2xl font-bold text-[var(--negative)]">{missingDocs}</div>
        </div>
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4">
          <div className="text-[var(--muted)] text-xs mb-1">Expired</div>
          <div className="text-2xl font-bold text-yellow-500">{expiredDocs}</div>
        </div>
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4">
          <div className="text-[var(--muted)] text-xs mb-1">Requested</div>
          <div className="text-2xl font-bold text-[var(--accent)]">{requestedDocs}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--muted)]">Person:</span>
          {["All", "Stuart", "Sasitron", "Property"].map((p) => (
            <button key={p} onClick={() => setFilterPerson(p)}
              className={`text-xs px-3 py-1 rounded border transition-colors ${
                filterPerson === p
                  ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10"
                  : "border-[var(--card-border)] text-[var(--muted)] hover:border-[var(--accent)]"
              }`}>{p}</button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--muted)]">Status:</span>
          {["All", "missing", "have", "expired", "requested", "n/a"].map((s) => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`text-xs px-3 py-1 rounded border transition-colors capitalize ${
                filterStatus === s
                  ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10"
                  : "border-[var(--card-border)] text-[var(--muted)] hover:border-[var(--accent)]"
              }`}>{s}</button>
          ))}
        </div>
        <button onClick={resetAll}
          className="text-xs px-3 py-1 rounded border border-[var(--card-border)] text-[var(--muted)] hover:text-[var(--negative)] hover:border-[var(--negative)] transition-colors ml-auto">
          Reset All
        </button>
      </div>

      {/* Document Categories */}
      {filteredCategories.map((cat) => {
        const catDocs = documents.filter((d) => d.category === cat.name);
        const catHave = catDocs.filter((d) => d.status === "have").length;

        if (cat.docs.length === 0) return null;

        return (
          <div key={cat.name} className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] overflow-hidden">
            <div className="px-5 py-3 border-b border-[var(--card-border)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono bg-[var(--accent)]/20 text-[var(--accent)] px-2 py-0.5 rounded">{cat.icon}</span>
                <h3 className="font-semibold">{cat.name}</h3>
              </div>
              <span className="text-xs text-[var(--muted)]">{catHave}/{catDocs.length} ready</span>
            </div>
            <div className="divide-y divide-[var(--card-border)]">
              {cat.docs.map((docDef, i) => {
                const doc = documents.find((d) => d.category === cat.name && d.name === docDef.name);
                if (!doc) return null;

                // Apply filters
                if (filterPerson !== "All" && doc.forPerson !== filterPerson && doc.forPerson !== "Both") return null;
                if (filterStatus !== "All" && doc.status !== filterStatus) return null;

                return (
                  <div key={doc.id} className="px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{doc.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                          doc.forPerson === "Stuart" ? "bg-blue-500/20 text-blue-400" :
                          doc.forPerson === "Sasitron" ? "bg-purple-500/20 text-purple-400" :
                          doc.forPerson === "Property" ? "bg-orange-500/20 text-orange-400" :
                          "bg-[var(--card-border)] text-[var(--muted)]"
                        }`}>{doc.forPerson}</span>
                      </div>
                      <p className="text-xs text-[var(--muted)] mt-0.5">{doc.description}</p>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0 items-end">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={doc.notes}
                          onChange={(e) => updateDoc(doc.id, "notes", e.target.value)}
                          placeholder="Notes..."
                          className="bg-[var(--background)] border border-[var(--card-border)] rounded px-2 py-1 text-xs w-32 focus:border-[var(--accent)] outline-none"
                        />
                        <label className="text-xs px-2 py-1 rounded border border-[var(--card-border)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] cursor-pointer transition-colors">
                          {uploading === doc.id ? "..." : "Upload"}
                          <input
                            type="file"
                            className="hidden"
                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) uploadFile(doc.id, doc.category, doc.forPerson, f);
                              e.target.value = "";
                            }}
                          />
                        </label>
                        <select
                          value={doc.status}
                          onChange={(e) => updateDoc(doc.id, "status", e.target.value)}
                          className={`border rounded px-2 py-1 text-xs font-medium outline-none ${
                            doc.status === "have"
                              ? "bg-[var(--positive)]/20 border-[var(--positive)]/30 text-[var(--positive)]"
                              : doc.status === "missing"
                              ? "bg-[var(--negative)]/20 border-[var(--negative)]/30 text-[var(--negative)]"
                              : doc.status === "expired"
                              ? "bg-yellow-500/20 border-yellow-500/30 text-yellow-500"
                              : doc.status === "n/a"
                              ? "bg-[var(--card-border)] border-[var(--card-border)] text-[var(--muted)]"
                              : "bg-[var(--accent)]/20 border-[var(--accent)]/30 text-[var(--accent)]"
                          }`}
                        >
                          <option value="missing">Missing</option>
                          <option value="have">Have</option>
                          <option value="expired">Expired</option>
                          <option value="requested">Requested</option>
                          <option value="n/a">N/A</option>
                        </select>
                      </div>
                      {/* OCR scanning indicator */}
                      {ocrLoading === doc.id && (
                        <div className="text-xs text-[var(--accent)] animate-pulse">Reading document...</div>
                      )}
                      {/* OCR results */}
                      {ocrResult?.docId === doc.id && (
                        <div className="bg-[var(--accent)]/10 border border-[var(--accent)]/30 rounded-lg p-3 text-xs space-y-1 w-full max-w-sm">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-[var(--accent)]">Extracted Data</span>
                            <button onClick={() => setOcrResult(null)} className="text-[var(--muted)] hover:text-white">dismiss</button>
                          </div>
                          {Object.entries(ocrResult.data).map(([key, val]) => {
                            if (val === null || val === undefined || val === 0 || val === "" || (Array.isArray(val) && val.length === 0)) return null;
                            const label = key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
                            const display = typeof val === "number"
                              ? val >= 100 ? `$${val.toLocaleString()}` : String(val)
                              : Array.isArray(val) ? val.map((v: Record<string, unknown>) => `${v.name || v.type}: ${typeof v.amount === "number" ? `$${v.amount}` : v.hours}`).join(", ")
                              : String(val);
                            return (
                              <div key={key} className="flex justify-between gap-2">
                                <span className="text-[var(--muted)]">{label}</span>
                                <span className="text-right font-medium">{display}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {/* Uploaded files */}
                      {getFilesForDoc(doc.id).map((f) => (
                        <div key={f.url} className="flex items-center gap-2 text-xs">
                          <a href={f.url} target="_blank" rel="noopener noreferrer"
                            className="text-[var(--accent)] hover:underline truncate max-w-[180px]">
                            {f.originalName}
                          </a>
                          <span className="text-[var(--muted)]">{formatFileSize(f.size)}</span>
                          <button onClick={() => deleteFile(f.url, doc.id)}
                            className="text-[var(--muted)] hover:text-[var(--negative)]">x</button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Broker Pack */}
      <div className="rounded-lg border border-[var(--positive)]/30 bg-[var(--positive)]/5 p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="font-semibold">Broker Pack</h4>
            <p className="text-xs text-[var(--muted)] mt-1">{files.length} files uploaded — {haveDocs}/{totalDocs} documents ready</p>
          </div>
          {files.length > 0 && (
            <a
              href="/api/broker-pack-download"
              className="px-4 py-2 bg-[var(--positive)] text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
            >
              Download ZIP
            </a>
          )}
        </div>
        {files.length > 0 && (
          <div className="space-y-2">
            <div className="max-h-48 overflow-y-auto space-y-1">
              {files.map((f) => (
                <div key={f.url} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[var(--muted)] shrink-0">{f.category}</span>
                    <a href={f.url} target="_blank" rel="noopener noreferrer"
                      className="text-[var(--accent)] hover:underline truncate">{f.originalName}</a>
                  </div>
                  <span className="text-[var(--muted)] shrink-0 ml-2">{formatFileSize(f.size)}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-[var(--muted)] pt-2">
              Files are organized into folders by category: BrokerPack/Identity/, BrokerPack/Income/, etc.
            </p>
          </div>
        )}
        {files.length === 0 && (
          <p className="text-sm text-[var(--muted)]">Upload documents above. When ready, download them all as one ZIP file to send to your broker.</p>
        )}
      </div>
    </div>
  );
}
