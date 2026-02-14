"use client";

import { useState, useEffect, useRef } from "react";
import { useMatchmakingStore, selectActiveConversation } from "@/lib/store";
import type { ConversationMessage, TopMatch, FruitPreferences } from "@/lib/types";

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
    if (!conversation?.messages) {
      setVisibleMessageCount(0);
      return;
    }

    // Reset animation when conversation changes
    setVisibleMessageCount(0);
    setTypingMessageId(null);

    const revealMessages = async () => {
      for (let i = 0; i < conversation.messages.length; i++) {
        setVisibleMessageCount(i + 1);
        setTypingMessageId(conversation.messages[i].id);

        await delay(MESSAGE_DELAY_MS);
        setTypingMessageId(null);
      }
    };

    revealMessages();
  }, [conversation?.id]); // Only re-run when conversation ID changes

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  // Get visible messages based on animation progress
  const visibleMessages = conversation?.messages.slice(0, visibleMessageCount) || [];

  return (
    <div className="conversation-container">
      {/* Empty State */}
      {!conversation && !isLoading && !error && (
        <div className="flex h-full min-h-[400px] items-center justify-center">
          <div className="text-center text-muted">
            <p className="text-4xl">💬</p>
            <p className="mt-4 text-lg font-medium">No conversation yet</p>
            <p className="mt-2 text-sm">
              Click &quot;New Conversation&quot; to start matchmaking
            </p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex h-full min-h-[400px] items-center justify-center">
          <div className="text-center">
            <p className="text-4xl">⚠️</p>
            <p className="mt-4 text-lg font-medium text-red-500">Error</p>
            <p className="mt-2 text-sm text-muted">{error}</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex h-full min-h-[400px] items-center justify-center">
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
            preferences={message.metadata.preferences}
          />
        )}
      </div>
    </div>
  );
}

// =============================================================================
// MATCHES SUMMARY COMPONENT
// =============================================================================

interface MatchesSummaryProps {
  matches: TopMatch[];
  fruitType?: "apple" | "orange";
  preferences?: FruitPreferences;
}

function MatchesSummary({ matches, fruitType, preferences }: MatchesSummaryProps) {
  if (matches.length === 0) {
    return (
      <div className="mt-4 rounded-lg border border-zinc-300 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900">
        <p className="text-sm text-muted">No matches found yet</p>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted">Top Matches:</p>
        <p className="text-xs text-muted">
          {matches[0].matched_preferences}/{matches[0].total_preferences} preferences matched
        </p>
      </div>

      {matches.map((match, index) => (
        <div
          key={match.apple_id || match.orange_id}
          className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">
                {fruitType === "apple" ? "🍊" : "🍎"}
              </span>
              <span className="text-sm font-medium">
                Match #{index + 1}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-pear px-3 py-1 text-xs font-bold text-white">
                {match.score}%
              </span>
            </div>
          </div>

          {/* Show what was matched */}
          {preferences && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted uppercase tracking-wide">
                Matching Preferences:
              </p>
              <div className="space-y-1">
                {(Object.entries(preferences) as [string, unknown][]).map(([key, value], idx) => {
                  // Skip null/undefined values
                  if (value === null || value === undefined) return null;

                  // Determine if this preference was matched
                  // We'll assume the first N preferences matched based on the score
                  const isMatched = idx < match.matched_preferences;

                  // Format the preference nicely
                  const formatValue = (v: unknown): string => {
                    if (typeof v === "object" && v !== null) {
                      const obj = v as Record<string, unknown>;
                      if ("min" in obj && "max" in obj) {
                        return `${obj.min}-${obj.max}`;
                      }
                      if ("min" in obj) return `≥${obj.min}`;
                      if ("max" in obj) return `≤${obj.max}`;
                      return JSON.stringify(v);
                    }
                    if (typeof v === "boolean") {
                      return v ? "yes" : "no";
                    }
                    return String(v);
                  };

                  const formatKey = (k: string): string => {
                    return k
                      .replace(/([A-Z])/g, " $1")
                      .replace(/^./, (str) => str.toUpperCase())
                      .trim();
                  };

                  return (
                    <div
                      key={key}
                      className="flex items-center gap-2 text-xs"
                    >
                      <span className={isMatched ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                        {isMatched ? "✓" : "✗"}
                      </span>
                      <span
                        className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-1 dark:bg-zinc-800"
                      >
                        <span className="text-muted">{formatKey(key)}:</span>
                        <span className="font-medium">{formatValue(value)}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
