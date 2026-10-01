"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth-provider";
import { listApi, AnimeListItem, ListStatus, statusOptions } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Plus, Check, Loader2, Clock, Eye, Pause, XCircle } from "lucide-react";
import Link from "next/link";

interface AddToListButtonProps {
  anidbId: number;
  title: string;
  titleEnglish?: string;
  imageUrl?: string;
  totalEpisodes?: number;
  /** Compact mode - shows only icon in a circular button (for popovers) */
  compact?: boolean;
}

// Status icons for visual display
export const statusIcons: Record<ListStatus, React.ReactNode> = {
  plan_to_watch: <Clock className="w-4 h-4" />,
  watching: <Eye className="w-4 h-4" />,
  completed: <Check className="w-4 h-4" />,
  paused: <Pause className="w-4 h-4" />,
  dropped: <XCircle className="w-4 h-4" />,
};

export function AddToListButton({
  anidbId,
  title,
  titleEnglish,
  imageUrl,
  totalEpisodes,
  compact = false,
}: AddToListButtonProps) {
  const { isAuthenticated } = useAuth();
  const [listItem, setListItem] = useState<AnimeListItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      checkIfInList();
    } else {
      setIsChecking(false);
    }
  }, [isAuthenticated, anidbId]);

  const checkIfInList = async () => {
    try {
      const result = await listApi.checkAnime(anidbId);
      setListItem(result.item);
    } catch (error) {
      console.error("Failed to check list:", error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleAddToList = async (status: ListStatus) => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    try {
      const result = await listApi.quickAdd(
        anidbId,
        status,
        title,
        titleEnglish,
        imageUrl,
        totalEpisodes,
      );
      setListItem(result);
      setIsOpen(false);
    } catch (error) {
      console.error("Failed to add to list:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Not authenticated - don't show anything in compact mode, show login button otherwise
  if (!isAuthenticated) {
    if (compact) return null;
    return (
      <Link href="/login">
        <Button variant="outline" className="gap-2 hover:cursor-pointer">
          <Plus className="h-4 w-4" />
          Add to List
        </Button>
      </Link>
    );
  }

  // Still checking
  if (isChecking) {
    if (compact) {
      return (
        <button
          disabled
          className="flex items-center justify-center rounded-full w-9 h-9 bg-purple-900 text-white"
        >
          <Loader2 className="w-4 h-4 animate-spin" />
        </button>
      );
    }
    return (
      <Button variant="outline" disabled className="gap-2 hover:cursor-pointer">
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  // Current status info
  const currentStatus = listItem
    ? statusOptions.find((s) => s.value === listItem.status)
    : null;

  // Compact mode - circular icon button for popovers
  if (compact) {
    return (
      <div className="relative">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          disabled={isLoading}
          className={`flex items-center justify-center rounded-full w-9 h-9 transition-colors text-white hover:cursor-pointer ${
            listItem
              ? "bg-green-600 hover:bg-green-700"
              : "bg-purple-900 hover:bg-purple-800"
          }`}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : listItem ? (
            statusIcons[listItem.status]
          ) : (
            <Plus className="w-4 h-4" />
          )}
        </button>

        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            {/* Dropdown - positioned to the right for compact mode */}
            <div className="absolute bottom-0 left-full ml-3 bg-popover border rounded-lg shadow-xl z-[300] min-w-[160px] py-1">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleAddToList(option.value);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center gap-2 hover:cursor-pointer ${
                    listItem?.status === option.value
                      ? "text-green-500 font-medium"
                      : ""
                  }`}
                >
                  <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                    {listItem?.status === option.value &&
                      statusIcons[option.value]}
                  </span>
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  // Default mode - full button with text
  return (
    <div className="relative">
      <Button
        variant={listItem ? "default" : "outline"}
        className="gap-2 hover:cursor-pointer"
        disabled={isLoading}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : listItem ? (
          <>
            {statusIcons[listItem.status]}
            {currentStatus?.label || "In List"}
          </>
        ) : (
          <>
            <Plus className="h-4 w-4" />
            Add to List
          </>
        )}
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          {/* Dropdown */}
          <div className="absolute top-full mt-1 left-0 bg-popover border rounded-lg shadow-xl z-50 min-w-[160px] py-1">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleAddToList(option.value)}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center gap-2 hover:cursor-pointer ${
                  listItem?.status === option.value
                    ? "text-green-500 font-medium"
                    : ""
                }`}
              >
                <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                  {listItem?.status === option.value &&
                    statusIcons[option.value]}
                </span>
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
