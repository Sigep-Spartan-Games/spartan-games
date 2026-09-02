"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useCallback } from "react";
import { ArrowDown, Loader2, RefreshCw } from "lucide-react";

interface PullToRefreshProps {
    children: React.ReactNode;
}

/**
 * Wraps content with:
 * - Pull-to-refresh gesture on mobile (touch devices)
 * - A refresh button visible on desktop
 */
export default function PullToRefresh({ children }: PullToRefreshProps) {
    const router = useRouter();
    const [pullDistance, setPullDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const startYRef = useRef(0);
    const pullingRef = useRef(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const THRESHOLD = 80; // px to trigger refresh
    const MAX_PULL = 120;

    const doRefresh = useCallback(() => {
        setIsRefreshing(true);
        router.refresh();
        // Give a brief visual delay so the spinner is visible
        setTimeout(() => {
            setIsRefreshing(false);
            setPullDistance(0);
        }, 800);
    }, [router]);

    // Touch handlers for mobile pull-to-refresh
    const onTouchStart = useCallback((e: React.TouchEvent) => {
        // Only enable pull-to-refresh if scrolled to top
        if (window.scrollY <= 0) {
            startYRef.current = e.touches[0].clientY;
            pullingRef.current = true;
        }
    }, []);

    const onTouchMove = useCallback(
        (e: React.TouchEvent) => {
            if (!pullingRef.current || isRefreshing) return;

            const currentY = e.touches[0].clientY;
            const diff = currentY - startYRef.current;

            if (diff > 0 && window.scrollY <= 0) {
                // Apply diminishing returns for a rubber-band feel
                const distance = Math.min(diff * 0.5, MAX_PULL);
                setPullDistance(distance);
            }
        },
        [isRefreshing],
    );

    const onTouchEnd = useCallback(() => {
        pullingRef.current = false;

        if (pullDistance >= THRESHOLD && !isRefreshing) {
            doRefresh();
        } else {
            setPullDistance(0);
        }
    }, [pullDistance, isRefreshing, doRefresh]);

    // Desktop refresh button click
    const handleDesktopRefresh = useCallback(() => {
        if (isRefreshing) return;
        doRefresh();
    }, [isRefreshing, doRefresh]);

    const progress = Math.min(pullDistance / THRESHOLD, 1);
    const showPullIndicator = pullDistance > 10;

    return (
        <div
            ref={containerRef}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >
            {/* Pull indicator (mobile only) */}
            <div
                className="md:hidden flex items-center justify-center overflow-hidden transition-[height] ease-out"
                style={{ height: showPullIndicator || isRefreshing ? `${Math.max(pullDistance, isRefreshing ? 48 : 0)}px` : "0px" }}
            >
                <div
                    className={[
                        "flex items-center gap-2 text-xs text-muted-foreground transition-opacity",
                        showPullIndicator || isRefreshing ? "opacity-100" : "opacity-0",
                    ].join(" ")}
                >
                    {isRefreshing ? (
                        <>
                            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                            Refreshing...
                        </>
                    ) : (
                        <>
                            <ArrowDown
                                aria-hidden="true"
                                className="h-4 w-4 transition-transform"
                                style={{ transform: `rotate(${progress * 180}deg)` }}
                            />
                            {progress >= 1 ? "Release to refresh" : "Pull to refresh"}
                        </>
                    )}
                </div>
            </div>

            {/* Desktop refresh button */}
            <div className="hidden md:flex justify-end mb-3">
                <button
                    type="button"
                    onClick={handleDesktopRefresh}
                    disabled={isRefreshing}
                    className="inline-flex h-10 items-center gap-1.5 rounded-control border px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground disabled:opacity-50"
                >
                    <RefreshCw aria-hidden="true" className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                    {isRefreshing ? "Refreshing..." : "Refresh"}
                </button>
            </div>

            {/* Content with pull transform on mobile */}
            <div
                className="md:transform-none"
                style={{
                    transform: pullDistance > 0 && !isRefreshing ? `translateY(0px)` : undefined,
                }}
            >
                {children}
            </div>
        </div>
    );
}
