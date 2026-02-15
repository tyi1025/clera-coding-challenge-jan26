"use client";

import { useMatchmakingStore, selectAppleCount, selectOrangeCount, selectMatchCount, selectAverageMatchScore } from "@/lib/store";
import { Conversation } from "@/app/components/Conversation";

// =============================================================================
// COMPONENTS
// =============================================================================

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: string;
  description: string;
}

function MetricCard({ title, value, icon, description }: MetricCardProps) {
  return (
    <div className="metric-card">
      <div className="flex items-center justify-between">
        <span className="text-2xl">{icon}</span>
        <span className="text-xs uppercase tracking-wide text-muted">
          {title}
        </span>
      </div>
      <div className="mt-4">
        <p className="text-3xl font-bold">{value}</p>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>
    </div>
  );
}

// =============================================================================
// PAGE
// =============================================================================

export default function DashboardPage() {
  // Zustand: Get state and actions
  const startMatchmaking = useMatchmakingStore((state) => state.startMatchmaking);
  const isLoading = useMatchmakingStore((state) => state.isLoading);
  const appleCount = useMatchmakingStore(selectAppleCount);
  const orangeCount = useMatchmakingStore(selectOrangeCount);
  const matchCount = useMatchmakingStore(selectMatchCount);
  const avgScore = useMatchmakingStore(selectAverageMatchScore);

  const handleNewConversation = async () => {
    // Randomly pick apple or orange
    const type = Math.random() > 0.5 ? "apple" : "orange";
    await startMatchmaking(type);
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white/80 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/80">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                🍎 Matchmaking Dashboard 🍊
              </h1>
              <p className="mt-1 text-sm text-muted">
                Creating perfect pears, one match at a time
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleNewConversation}
                disabled={isLoading}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Matching..." : "New Conversation"}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Metrics Section */}
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold">Overview Metrics</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Total Apples"
              value={appleCount}
              icon="🍎"
              description="Apples generated"
            />
            <MetricCard
              title="Total Oranges"
              value={orangeCount}
              icon="🍊"
              description="Oranges generated"
            />
            <MetricCard
              title="Total Matches"
              value={matchCount}
              icon="🍐"
              description="Successful pear-ings"
            />
            <MetricCard
              title="Avg Score"
              value={matchCount > 0 ? `${avgScore}%` : "N/A"}
              icon="📊"
              description="Match quality"
            />
          </div>
        </section>

        {/* Conversation Visualization Section */}
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold">
            Matchmaking Conversation
          </h2>
          <Conversation />
        </section>
      </main>
    </div>
  );
}
