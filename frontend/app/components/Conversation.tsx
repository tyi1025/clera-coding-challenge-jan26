"use client";

import { useState, useEffect, useRef } from "react";
import { useMatchmakingStore, selectActiveConversation } from "@/lib/store";
import type { ConversationMessage, TopMatch, PreferenceDetail, FruitAttributes } from "@/lib/types";

// =============================================================================
// CONSTANTS
// =============================================================================

const TYPING_SPEED_MS = 30;
const MESSAGE_DELAY_MS = 800;

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function Conversation() {
  // Zustand: Subscribe to global state
  const conversation = useMatchmakingStore(selectActiveConversation);
  const isLoading = useMatchmakingStore((state) => state.isLoading);
  const error = useMatchmakingStore((state) => state.error);

  // React local state: UI animation only
  const [visibleMessageCount, setVisibleMessageCount] = useState(0);
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages appear
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [visibleMessageCount]);

  // Progressive message reveal animation
  useEffect(() => {
    // Helper function for delays (defined inside to avoid dependency issues)
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    
    if (!conversation?.messages) {
      return;
    }

    // Reset animation state and reveal messages
    let isCancelled = false;
    
    const revealMessages = async () => {
      // Reset
      setVisibleMessageCount(0);
      setTypingMessageId(null);
      
      for (let i = 0; i < conversation.messages.length; i++) {
        if (isCancelled) break;
        
        setVisibleMessageCount(i + 1);
        setTypingMessageId(conversation.messages[i].id);

        await delay(MESSAGE_DELAY_MS);
        
        if (isCancelled) break;
        setTypingMessageId(null);
      }
    };

    revealMessages();
    
    return () => {
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Only re-animate when conversation ID changes, not on every message update
  }, [conversation?.id]); // Only depend on conversation ID to avoid re-triggering

  // Get visible messages based on animation progress
  const visibleMessages = conversation?.messages.slice(0, visibleMessageCount) || [];

  return (
    <div className="conversation-container">
      {/* Empty State */}
      {!conversation && !isLoading && !error && (
        <div className="flex h-full min-h-100 items-center justify-center">
          <div className="text-center text-muted">
            <p className="text-4xl">💬</p>
            <p className="mt-4 text-lg font-medium">No conversation yet</p>
            <p className="mt-2 text-sm">
              Click &quot;New Apple&quot; or &quot;New Orange&quot; to start matchmaking
            </p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex h-full min-h-100 items-center justify-center">
          <div className="text-center">
            <p className="text-4xl">⚠️</p>
            <p className="mt-4 text-lg font-medium text-red-500">Error</p>
            <p className="mt-2 text-sm text-muted">{error}</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex h-full min-h-100 items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
            <p className="mt-4 text-sm text-muted">
              Generating fruit and finding matches...
            </p>
          </div>
        </div>
      )}

      {/* Messages */}
      {visibleMessages.length > 0 && (
        <div className="conversation-messages">
          {visibleMessages.map((message) => (
            <MessageDisplay
              key={message.id}
              message={message}
              isTyping={typingMessageId === message.id}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>
      )}
    </div>
  );
}

// =============================================================================
// MESSAGE DISPLAY COMPONENT
// =============================================================================

interface MessageDisplayProps {
  message: ConversationMessage;
  isTyping: boolean;
}

function MessageDisplay({ message, isTyping }: MessageDisplayProps) {
  // React local state: UI animation only
  const [displayedContent, setDisplayedContent] = useState("");
  const [showCursor, setShowCursor] = useState(true);

  // Typing animation
  useEffect(() => {
    if (!isTyping) {
      setDisplayedContent(message.content);
      setShowCursor(false);
      return;
    }

    let currentIndex = 0;
    const intervalId = setInterval(() => {
      if (currentIndex <= message.content.length) {
        setDisplayedContent(message.content.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(intervalId);
        setShowCursor(false);
      }
    }, TYPING_SPEED_MS);

    return () => clearInterval(intervalId);
  }, [isTyping, message.content]);

  // Cursor blink animation
  useEffect(() => {
    if (!isTyping) return;

    const blinkInterval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 500);

    return () => clearInterval(blinkInterval);
  }, [isTyping]);

  const getFruitIcon = (fruitType?: "apple" | "orange") => {
    if (fruitType === "apple") return "🍎";
    if (fruitType === "orange") return "🍊";
    return "🤖";
  };

  const getMessageClass = () => {
    switch (message.role) {
      case "fruit":
        return "message-fruit";
      case "system":
        return "message-system";
      case "result":
        return "message-result";
      default:
        return "";
    }
  };

  return (
    <div className={`conversation-message ${getMessageClass()} animate-fade-in`}>
      <div className="message-icon">
        {message.role === "system"
          ? "🔍"
          : getFruitIcon(message.metadata?.fruitType)}
      </div>
      <div className="message-content">
        <div className="message-text">
          {displayedContent}
          {showCursor && <span className="message-cursor">|</span>}
        </div>
        {message.role === "result" && message.metadata?.matches && (
          <MatchesSummary
            matches={message.metadata.matches}
            fruitType={message.metadata.fruitType}
            seekerAttributes={message.metadata.attributes}
          />
        )}
      </div>
    </div>
  );
}

// =============================================================================
// SEEKER PROFILE COMPONENT
// =============================================================================

interface SeekerProfileProps {
  attributes: FruitAttributes;
  fruitType?: "apple" | "orange";
}

function SeekerProfile({ attributes, fruitType }: SeekerProfileProps) {
  const fruitIcon = fruitType === "apple" ? "🍎" : "🍊";
  
  const formatAttributeValue = (value: number | boolean | string | null): string => {
    if (value === null) return "unknown";
    if (typeof value === "boolean") return value ? "yes" : "no";
    if (typeof value === "number") return String(Math.round(value * 10) / 10);
    return String(value);
  };

  return (
    <div className="mb-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{fruitIcon}</span>
        <p className="text-sm font-medium">Seeker Profile</p>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3 md:grid-cols-4">
        <div className="rounded bg-white px-2 py-1.5 dark:bg-zinc-950">
          <span className="text-muted">Size:</span>{" "}
          <span className="font-medium">{formatAttributeValue(attributes.size)}</span>
        </div>
        <div className="rounded bg-white px-2 py-1.5 dark:bg-zinc-950">
          <span className="text-muted">Weight:</span>{" "}
          <span className="font-medium">{formatAttributeValue(attributes.weight)}</span>
        </div>
        <div className="rounded bg-white px-2 py-1.5 dark:bg-zinc-950">
          <span className="text-muted">Stem:</span>{" "}
          <span className="font-medium">{formatAttributeValue(attributes.hasStem)}</span>
        </div>
        <div className="rounded bg-white px-2 py-1.5 dark:bg-zinc-950">
          <span className="text-muted">Leaf:</span>{" "}
          <span className="font-medium">{formatAttributeValue(attributes.hasLeaf)}</span>
        </div>
        <div className="rounded bg-white px-2 py-1.5 dark:bg-zinc-950">
          <span className="text-muted">Worm:</span>{" "}
          <span className="font-medium">{formatAttributeValue(attributes.hasWorm)}</span>
        </div>
        <div className="rounded bg-white px-2 py-1.5 dark:bg-zinc-950">
          <span className="text-muted">Shine:</span>{" "}
          <span className="font-medium">{formatAttributeValue(attributes.shineFactor)}</span>
        </div>
        <div className="rounded bg-white px-2 py-1.5 dark:bg-zinc-950">
          <span className="text-muted">Chemicals:</span>{" "}
          <span className="font-medium">{formatAttributeValue(attributes.hasChemicals)}</span>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MATCHES SUMMARY COMPONENT
// =============================================================================

// Threshold above which a preference is considered "matched" (must match backend)
const PREFERENCE_MATCH_THRESHOLD = 0.8;

// Preference keys in display order
const PREFERENCE_DISPLAY_ORDER = [
  "hasWorm",
  "hasChemicals",
  "size",
  "weight",
  "shineFactor",
  "hasStem",
  "hasLeaf",
] as const;

// Human-readable labels for preference keys
const PREFERENCE_LABELS: Record<string, string> = {
  size: "Size",
  weight: "Weight",
  hasStem: "Has Stem",
  hasLeaf: "Has Leaf",
  hasWorm: "Has Worm",
  shineFactor: "Shine",
  hasChemicals: "Chemicals",
};

interface MatchesSummaryProps {
  matches: TopMatch[];
  fruitType?: "apple" | "orange";
  seekerAttributes?: FruitAttributes;
}

function MatchesSummary({ matches, fruitType, seekerAttributes }: MatchesSummaryProps) {
  if (matches.length === 0) {
    return (
      <div className="mt-4 rounded-lg border border-zinc-300 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900">
        <p className="text-sm text-muted">No matches found yet</p>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      {seekerAttributes && (
        <SeekerProfile attributes={seekerAttributes} fruitType={fruitType} />
      )}
      
      <p className="text-sm font-medium text-muted">
        Top Matches ({matches.length}):
      </p>

      {matches.map((match, index) => (
        <MatchCard
          key={match.apple_id || match.orange_id}
          match={match}
          index={index}
          fruitType={fruitType}
        />
      ))}
    </div>
  );
}

// =============================================================================
// INDIVIDUAL MATCH CARD
// =============================================================================

interface MatchCardComponentProps {
  match: TopMatch;
  index: number;
  fruitType?: "apple" | "orange";
}

/**
 * Formats a preference's actual value for display
 */
function formatActualValue(value: number | boolean | string | null): string {
  if (value === null) return "unknown";
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (typeof value === "number") return String(Math.round(value * 10) / 10);
  return String(value);
}

/**
 * Formats a preference's expected value for display
 */
function formatExpectedValue(value: string | boolean): string {
  if (typeof value === "boolean") return value ? "yes" : "no";
  return String(value);
}

function MatchCard({ match, index, fruitType }: MatchCardComponentProps) {
  const hasDetails = !!match.details;
  const hasReverseDetails = !!match.reverse_details;
  const matchIcon = fruitType === "apple" ? "🍊" : "🍎";
  const seekerIcon = fruitType === "apple" ? "🍎" : "🍊";
  const matchType = fruitType === "apple" ? "Orange" : "Apple";
  const seekerType = fruitType === "apple" ? "Apple" : "Orange";
  
  // Calculate mutual score (average of forward and reverse)
  const mutualScore = match.reverse_score !== undefined 
    ? Math.round((match.score + match.reverse_score) / 2)
    : match.score;

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      {/* Header: Match number + preference count + mutual score */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{matchIcon}</span>
          <span className="text-sm font-medium">Match #{index + 1}</span>
          <span className="text-xs text-muted">
            ({match.matched_preferences}/{match.total_preferences} preferences)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ScoreBadge score={mutualScore} />
        </div>
      </div>

      {/* Forward direction: What the seeker wants */}
      {hasDetails && (
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">{seekerIcon}</span>
            <p className="text-xs font-medium text-muted uppercase tracking-wide">
              What {seekerType} wants:
            </p>
            <span className="ml-auto">
              <ScoreBadge score={match.score} />
            </span>
          </div>
          <div className="space-y-1.5">
            {PREFERENCE_DISPLAY_ORDER.map((key) => {
              const detail = match.details?.[key] as PreferenceDetail | undefined;
              if (!detail) return null;

              const isMatched = detail.score >= PREFERENCE_MATCH_THRESHOLD;

              return (
                <div
                  key={key}
                  className="flex items-center gap-2 text-xs"
                >
                  <span
                    className={
                      isMatched
                        ? "text-green-600 dark:text-green-400 w-4 text-center"
                        : "text-red-600 dark:text-red-400 w-4 text-center"
                    }
                  >
                    {isMatched ? "✓" : "✗"}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-zinc-100 px-2 py-1 dark:bg-zinc-800 w-full">
                    <span className="text-muted w-20 shrink-0">
                      {PREFERENCE_LABELS[key] || key}:
                    </span>
                    <span className="font-medium text-muted">
                      wants{" "}
                      <span className="text-foreground">
                        {formatExpectedValue(detail.expected)}
                      </span>
                    </span>
                    <span className="text-muted mx-1">|</span>
                    <span className="font-medium text-muted">
                      has{" "}
                      <span className="text-foreground">
                        {formatActualValue(detail.actual)}
                      </span>
                    </span>
                    {/* Score indicator bar */}
                    <span className="ml-auto flex items-center gap-1">
                      <span className="h-1.5 w-8 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
                        <span
                          className={`block h-full rounded-full transition-all ${
                            detail.score >= PREFERENCE_MATCH_THRESHOLD
                              ? "bg-green-500"
                              : detail.score >= 0.5
                              ? "bg-yellow-500"
                              : "bg-red-500"
                          }`}
                          style={{ width: `${Math.round(detail.score * 100)}%` }}
                        />
                      </span>
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Reverse direction: What the candidate wants */}
      {hasReverseDetails && match.reverse_score !== undefined && (
        <div className="space-y-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">{matchIcon}</span>
            <p className="text-xs font-medium text-muted uppercase tracking-wide">
              What {matchType} wants:
            </p>
            <span className="ml-auto">
              <ScoreBadge score={match.reverse_score} />
            </span>
          </div>
          <div className="space-y-1.5">
            {PREFERENCE_DISPLAY_ORDER.map((key) => {
              const detail = match.reverse_details?.[key] as PreferenceDetail | undefined;
              if (!detail) return null;

              const isMatched = detail.score >= PREFERENCE_MATCH_THRESHOLD;

              return (
                <div
                  key={key}
                  className="flex items-center gap-2 text-xs"
                >
                  <span
                    className={
                      isMatched
                        ? "text-green-600 dark:text-green-400 w-4 text-center"
                        : "text-red-600 dark:text-red-400 w-4 text-center"
                    }
                  >
                    {isMatched ? "✓" : "✗"}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-zinc-100 px-2 py-1 dark:bg-zinc-800 w-full">
                    <span className="text-muted w-20 shrink-0">
                      {PREFERENCE_LABELS[key] || key}:
                    </span>
                    <span className="font-medium text-muted">
                      wants{" "}
                      <span className="text-foreground">
                        {formatExpectedValue(detail.expected)}
                      </span>
                    </span>
                    <span className="text-muted mx-1">|</span>
                    <span className="font-medium text-muted">
                      has{" "}
                      <span className="text-foreground">
                        {formatActualValue(detail.actual)}
                      </span>
                    </span>
                    {/* Score indicator bar */}
                    <span className="ml-auto flex items-center gap-1">
                      <span className="h-1.5 w-8 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
                        <span
                          className={`block h-full rounded-full transition-all ${
                            detail.score >= PREFERENCE_MATCH_THRESHOLD
                              ? "bg-green-500"
                              : detail.score >= 0.5
                              ? "bg-yellow-500"
                              : "bg-red-500"
                          }`}
                          style={{ width: `${Math.round(detail.score * 100)}%` }}
                        />
                      </span>
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Fallback if no details available (backward compatibility) */}
      {!hasDetails && !hasReverseDetails && (
        <p className="text-xs text-muted">
          {match.matched_preferences}/{match.total_preferences} preferences satisfied
        </p>
      )}
    </div>
  );
}

// =============================================================================
// SCORE BADGE COMPONENT
// =============================================================================

function ScoreBadge({ score }: { score: number }) {
  const bgClass =
    score >= 90
      ? "bg-green-600"
      : score >= 70
      ? "bg-pear"
      : score >= 50
      ? "bg-yellow-500"
      : "bg-red-500";

  return (
    <span className={`rounded-full ${bgClass} px-3 py-1 text-xs font-bold text-white`}>
      {score}%
    </span>
  );
}
