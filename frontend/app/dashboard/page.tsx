"use client";

import { useMemo } from "react";
import { useMatchmakingStore, selectAppleCount, selectOrangeCount, selectMatchCount, selectAverageMatchScore } from "@/lib/store";
import { Conversation } from "@/app/components/Conversation";
import type { Conversation as ConversationType } from "@/lib/types";

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

interface QualityBarProps {
  label: string;
  count: number;
  total: number;
  color: string;
  range: string;
}

function QualityBar({ label, count, total, color, range }: QualityBarProps) {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
  
  return (
    <div className="metric-card">
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium">{label}</span>
          <span className="text-xs text-muted">{range}</span>
        </div>
        <p className="text-2xl font-bold">{count}</p>
        <p className="text-xs text-muted">{percentage}% of matches</p>
      </div>
      <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
        <div 
          className={`h-full ${color} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

interface MatchCardProps {
  match: {
    id: string;
    appleId: string;
    orangeId: string;
    mutualScore: number;
    createdAt: Date;
  };
}

function MatchCard({ match }: MatchCardProps) {
  const scorePercent = Math.round(match.mutualScore * 100);
  
  return (
    <div className="metric-card flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <span className="text-2xl">🍎</span>
          <span className="text-xl">💚</span>
          <span className="text-2xl">🍊</span>
        </div>
        <div>
          <p className="text-sm font-medium">Perfect Pair</p>
          <p className="text-xs text-muted">
            {new Date(match.createdAt).toLocaleString()}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {scorePercent}%
          </p>
          <p className="text-xs text-muted">Compatible</p>
        </div>
      </div>
    </div>
  );
}

interface ConversationHistoryItemProps {
  conversation: ConversationType;
  isActive: boolean;
  onClick: () => void;
}

function ConversationHistoryItem({ conversation, isActive, onClick }: ConversationHistoryItemProps) {
  const fruitIcon = conversation.type === "apple" ? "🍎" : "🍊";
  const topMatches = conversation.response.matches.top_matches;
  const bestScore = topMatches.length > 0
    ? Math.max(...topMatches.map((m) => m.score))
    : 0;
  const matchCountDisplay = topMatches.length;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-lg border p-3 transition-all hover:shadow-md ${
        isActive
          ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
          : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{fruitIcon}</span>
          <div>
            <p className="text-sm font-medium capitalize">
              {conversation.type} Conversation
            </p>
            <p className="text-xs text-muted">
              {new Date(conversation.createdAt).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className={`text-lg font-bold ${
              bestScore >= 90
                ? "text-green-600 dark:text-green-400"
                : bestScore >= 70
                ? "text-blue-600 dark:text-blue-400"
                : "text-yellow-600 dark:text-yellow-400"
            }`}>
              {bestScore > 0 ? `${bestScore}%` : "—"}
            </p>
            <p className="text-xs text-muted">
              {matchCountDisplay} {matchCountDisplay === 1 ? "match" : "matches"}
            </p>
          </div>
          {isActive && (
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          )}
        </div>
      </div>
    </button>
  );
}


// =============================================================================
// PAGE
// =============================================================================

export default function DashboardPage() {
  // Zustand: Get state and actions
  const startMatchmaking = useMatchmakingStore((state) => state.startMatchmaking);
  const setActiveConversation = useMatchmakingStore((state) => state.setActiveConversation);
  const isLoading = useMatchmakingStore((state) => state.isLoading);
  const appleCount = useMatchmakingStore(selectAppleCount);
  const orangeCount = useMatchmakingStore(selectOrangeCount);
  const matchCount = useMatchmakingStore(selectMatchCount);
  const avgScore = useMatchmakingStore(selectAverageMatchScore);
  const conversations = useMatchmakingStore((state) => state.conversations);
  const activeConversationId = useMatchmakingStore((state) => state.activeConversationId);
  
  // Get matches array for memoization
  const matches = useMatchmakingStore((state) => state.matches);
  
  // Conversations sorted newest first for the history panel
  const sortedConversations = useMemo(
    () => [...conversations].sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ),
    [conversations]
  );
  
  // Memoize complex selectors that return new objects/arrays to prevent infinite re-renders
  // We compute from the matches array dependency to ensure updates when matches change
  const qualityDistribution = useMemo(() => {
    const distribution = {
      excellent: 0, // 90-100%
      good: 0,      // 70-89%
      fair: 0,      // 50-69%
      poor: 0,      // 0-49%
    };

    matches.forEach((match) => {
      const scorePercent = match.mutualScore * 100;
      if (scorePercent >= 90) distribution.excellent++;
      else if (scorePercent >= 70) distribution.good++;
      else if (scorePercent >= 50) distribution.fair++;
      else distribution.poor++;
    });

    return distribution;
  }, [matches]);
  
  const highQualityMatches = useMemo(() => {
    return matches
      .filter((m) => m.mutualScore >= 0.8)
      .sort((a, b) => b.mutualScore - a.mutualScore)
      .slice(0, 5);
  }, [matches]);

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

        {/* Match Quality Distribution */}
        {matchCount > 0 && (
          <section className="mb-8">
            <h2 className="mb-4 text-lg font-semibold">Match Quality Distribution</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <QualityBar
                label="Excellent"
                count={qualityDistribution.excellent}
                total={matchCount}
                color="bg-green-500"
                range="90-100%"
              />
              <QualityBar
                label="Good"
                count={qualityDistribution.good}
                total={matchCount}
                color="bg-blue-500"
                range="70-89%"
              />
              <QualityBar
                label="Fair"
                count={qualityDistribution.fair}
                total={matchCount}
                color="bg-yellow-500"
                range="50-69%"
              />
              <QualityBar
                label="Poor"
                count={qualityDistribution.poor}
                total={matchCount}
                color="bg-red-500"
                range="0-49%"
              />
            </div>
          </section>
        )}

        {/* High Quality Matches */}
        {highQualityMatches.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-4 text-lg font-semibold">Top Quality Matches 🏆</h2>
            <div className="space-y-3">
              {highQualityMatches.map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          </section>
        )}

        {/* Conversation History + Active Conversation */}
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold">
            Matchmaking Conversations
          </h2>

          {sortedConversations.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
              {/* History sidebar */}
              <div className="space-y-2 lg:max-h-[600px] lg:overflow-y-auto lg:pr-2">
                <p className="text-xs font-medium text-muted uppercase tracking-wide mb-2">
                  History ({sortedConversations.length})
                </p>
                {sortedConversations.map((conv) => (
                  <ConversationHistoryItem
                    key={conv.id}
                    conversation={conv}
                    isActive={conv.id === activeConversationId}
                    onClick={() => setActiveConversation(conv.id)}
                  />
                ))}
              </div>

              {/* Active conversation detail */}
              <div>
                <Conversation />
              </div>
            </div>
          ) : (
            <Conversation />
          )}
        </section>
      </main>
    </div>
  );
}
