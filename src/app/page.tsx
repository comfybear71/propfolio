const sampleProperties = [
  {
    id: 1,
    address: "12 Ocean Drive",
    suburb: "Scarborough",
    state: "WA",
    purchasePrice: 520000,
    purchaseDate: "2021-03-15",
    currentValue: 645000,
    mortgageRemaining: 416000,
    weeklyRent: 550,
    status: "Owned" as const,
  },
  {
    id: 2,
    address: "45 Railway Parade",
    suburb: "Midland",
    state: "WA",
    purchasePrice: 385000,
    purchaseDate: "2023-08-01",
    currentValue: 420000,
    mortgageRemaining: 346500,
    weeklyRent: 450,
    status: "Owned" as const,
  },
  {
    id: 3,
    address: "8 Banksia Crescent",
    suburb: "Baldivis",
    state: "WA",
    purchasePrice: 0,
    purchaseDate: "",
    currentValue: 510000,
    mortgageRemaining: 0,
    weeklyRent: 0,
    status: "Watching" as const,
  },
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function Home() {
  const ownedProperties = sampleProperties.filter((p) => p.status === "Owned");

  const totalValue = ownedProperties.reduce(
    (sum, p) => sum + p.currentValue,
    0
  );
  const totalMortgage = ownedProperties.reduce(
    (sum, p) => sum + p.mortgageRemaining,
    0
  );
  const totalEquity = totalValue - totalMortgage;
  const totalWeeklyRent = ownedProperties.reduce(
    (sum, p) => sum + p.weeklyRent,
    0
  );
  const annualRentalIncome = totalWeeklyRent * 52;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-1">Dashboard</h2>
        <p className="text-[var(--muted)]">
          Your property portfolio at a glance
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          label="Total Portfolio Value"
          value={formatCurrency(totalValue)}
        />
        <SummaryCard
          label="Total Equity"
          value={formatCurrency(totalEquity)}
          positive
        />
        <SummaryCard
          label="Total Mortgage"
          value={formatCurrency(totalMortgage)}
        />
        <SummaryCard
          label="Annual Rental Income"
          value={formatCurrency(annualRentalIncome)}
          positive
        />
      </div>

      {/* Properties Table */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Properties</h3>
        <div className="overflow-x-auto rounded-lg border border-[var(--card-border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--card)] text-left text-[var(--muted)]">
                <th className="px-4 py-3 font-medium">Property</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">
                  Purchase Price
                </th>
                <th className="px-4 py-3 font-medium text-right">
                  Current Value
                </th>
                <th className="px-4 py-3 font-medium text-right">Equity</th>
                <th className="px-4 py-3 font-medium text-right">
                  Weekly Rent
                </th>
                <th className="px-4 py-3 font-medium">Purchased</th>
              </tr>
            </thead>
            <tbody>
              {sampleProperties.map((property) => {
                const equity =
                  property.currentValue - property.mortgageRemaining;
                const growth = property.purchasePrice
                  ? (
                      ((property.currentValue - property.purchasePrice) /
                        property.purchasePrice) *
                      100
                    ).toFixed(1)
                  : null;

                return (
                  <tr
                    key={property.id}
                    className="border-t border-[var(--card-border)] hover:bg-[var(--card)]"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium">{property.address}</div>
                      <div className="text-[var(--muted)] text-xs">
                        {property.suburb}, {property.state}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          property.status === "Owned"
                            ? "bg-[var(--positive)]/20 text-[var(--positive)]"
                            : "bg-[var(--accent)]/20 text-[var(--accent)]"
                        }`}
                      >
                        {property.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {property.purchasePrice
                        ? formatCurrency(property.purchasePrice)
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatCurrency(property.currentValue)}
                      {growth && (
                        <span className="text-[var(--positive)] text-xs ml-1">
                          +{growth}%
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {property.status === "Owned"
                        ? formatCurrency(equity)
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {property.weeklyRent
                        ? formatCurrency(property.weeklyRent)
                        : "-"}
                      {property.weeklyRent ? (
                        <span className="text-[var(--muted)] text-xs">
                          /wk
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)]">
                      {formatDate(property.purchaseDate)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4">
          <div className="text-[var(--muted)] text-sm mb-1">
            Properties Owned
          </div>
          <div className="text-2xl font-bold">{ownedProperties.length}</div>
        </div>
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4">
          <div className="text-[var(--muted)] text-sm mb-1">
            Avg. Weekly Rent
          </div>
          <div className="text-2xl font-bold">
            {formatCurrency(totalWeeklyRent / ownedProperties.length)}
          </div>
        </div>
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4">
          <div className="text-[var(--muted)] text-sm mb-1">
            Portfolio LVR
          </div>
          <div className="text-2xl font-bold">
            {((totalMortgage / totalValue) * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      <p className="text-center text-[var(--muted)] text-xs pt-4">
        Built with care in Perth, WA
      </p>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4">
      <div className="text-[var(--muted)] text-sm mb-1">{label}</div>
      <div
        className={`text-2xl font-bold ${positive ? "text-[var(--positive)]" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}
