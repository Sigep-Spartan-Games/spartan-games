"use client";

import { useState, useRef, useEffect, useMemo, useId } from "react";
import { ChevronDown } from "lucide-react";

export type ComboboxOption = {
    value: string;
    label: string;
    description?: string;
};

type ComboboxProps = {
    options: ComboboxOption[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    name?: string;
    required?: boolean;
    className?: string;
};

export function Combobox({
    options,
    value,
    onChange,
    placeholder = "Search...",
    name,
    required,
    className = "",
}: ComboboxProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [highlightIndex, setHighlightIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    const listId = useId();

    const selectedOption = useMemo(
        () => options.find((o) => o.value === value),
        [options, value]
    );

    const filteredOptions = useMemo(() => {
        if (!search.trim()) return options;
        const lower = search.toLowerCase();
        return options.filter(
            (o) =>
                o.label.toLowerCase().includes(lower) ||
                o.value.toLowerCase().includes(lower)
        );
    }, [options, search]);

    // Reset highlight when filtered options change
    useEffect(() => {
        setHighlightIndex(0);
    }, [filteredOptions]);

    // Close on outside click
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
                setSearch("");
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Scroll highlighted item into view
    useEffect(() => {
        if (isOpen && listRef.current) {
            const item = listRef.current.children[highlightIndex] as HTMLElement;
            if (item) {
                item.scrollIntoView({ block: "nearest" });
            }
        }
    }, [highlightIndex, isOpen]);

    function handleSelect(optionValue: string) {
        onChange(optionValue);
        setIsOpen(false);
        setSearch("");
        inputRef.current?.blur();
    }

    function handleKeyDown(e: React.KeyboardEvent) {
        if (!isOpen) {
            if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter") {
                e.preventDefault();
                setIsOpen(true);
            }
            return;
        }

        switch (e.key) {
            case "ArrowDown":
                e.preventDefault();
                setHighlightIndex((i) => Math.min(i + 1, filteredOptions.length - 1));
                break;
            case "ArrowUp":
                e.preventDefault();
                setHighlightIndex((i) => Math.max(i - 1, 0));
                break;
            case "Enter":
                e.preventDefault();
                if (filteredOptions[highlightIndex]) {
                    handleSelect(filteredOptions[highlightIndex].value);
                }
                break;
            case "Escape":
                e.preventDefault();
                setIsOpen(false);
                setSearch("");
                break;
        }
    }

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            {/* Hidden input for form submission */}
            {name && <input type="hidden" name={name} value={value} />}

            {/* Visible input */}
            <input
                ref={inputRef}
                type="text"
                value={isOpen ? search : selectedOption?.label ?? ""}
                onChange={(e) => {
                    setSearch(e.target.value);
                    if (!isOpen) setIsOpen(true);
                }}
                onFocus={() => {
                    setIsOpen(true);
                    setSearch("");
                }}
                onKeyDown={handleKeyDown}
                placeholder={isOpen ? placeholder : selectedOption?.label ?? placeholder}
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={isOpen}
                aria-controls={listId}
                aria-activedescendant={
                    isOpen && filteredOptions[highlightIndex]
                        ? `${listId}-option-${highlightIndex}`
                        : undefined
                }
                className="h-11 w-full rounded-control border border-input bg-card px-3 pr-10 text-base shadow-sm shadow-foreground/[0.02] placeholder:text-muted-foreground/80 focus:outline-none focus:ring-2 focus:ring-ring/30 md:h-10 md:text-sm"
                required={required && !value}
                autoComplete="off"
            />

            {/* Dropdown chevron */}
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                <ChevronDown
                    aria-hidden="true"
                    className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
            </div>

            {/* Dropdown list */}
            {isOpen && (
                <ul
                    ref={listRef}
                    id={listId}
                    role="listbox"
                    className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-control border bg-popover p-1 text-popover-foreground shadow-xl shadow-foreground/10"
                >
                    {filteredOptions.length === 0 ? (
                        <li className="px-3 py-2 text-sm text-muted-foreground">
                            No activities found
                        </li>
                    ) : (
                        filteredOptions.map((option, idx) => (
                            <li
                                key={option.value}
                                id={`${listId}-option-${idx}`}
                                role="option"
                                aria-selected={option.value === value}
                                onClick={() => handleSelect(option.value)}
                                onMouseDown={(event) => event.preventDefault()}
                                onMouseEnter={() => setHighlightIndex(idx)}
                                className={`min-h-11 cursor-pointer rounded-md px-3 py-2 text-sm ${idx === highlightIndex
                                        ? "bg-primary/10 text-primary"
                                        : option.value === value
                                            ? "bg-muted"
                                            : "hover:bg-muted/50"
                                    }`}
                            >
                                <div className="font-medium">{option.label}</div>
                                {option.description && (
                                    <div className="text-xs text-muted-foreground">
                                        {option.description}
                                    </div>
                                )}
                            </li>
                        ))
                    )}
                </ul>
            )}
        </div>
    );
}
