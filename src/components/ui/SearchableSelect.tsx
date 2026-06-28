"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type React from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";

export type SearchableSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type SearchableSelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  searchPlaceholder?: string;
  emptyText?: string;
  style?: React.CSSProperties;
  className?: string;
  ariaLabel?: string;
};

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export default function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder = "Seleccionar...",
  disabled = false,
  searchPlaceholder = "Buscar...",
  emptyText = "Sin resultados",
  style,
  className,
  ariaLabel,
}: SearchableSelectProps) {
  const listboxId = useId();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 260 });
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);

  const selectedOption = options.find((option) => option.value === value);
  const filteredOptions = useMemo(() => {
    const term = normalize(query.trim());
    if (!term) return options;
    return options.filter((option) => normalize(option.label).includes(term));
  }, [options, query]);

  const openSelect = (initialQuery = "") => {
    const nextOptions = initialQuery
      ? options.filter((option) => normalize(option.label).includes(normalize(initialQuery)))
      : options;
    updatePosition();
    setPortalContainer(triggerRef.current?.closest('[role="dialog"]') as HTMLElement | null);
    setQuery(initialQuery);
    setActiveIndex(Math.max(0, nextOptions.findIndex((option) => option.value === value)));
    setOpen(true);
  };

  const updatePosition = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const viewportGap = 12;
    const dropdownHeight = Math.min(330, window.innerHeight - rect.bottom - viewportGap);
    const opensDown = dropdownHeight >= 190 || rect.top < window.innerHeight - rect.bottom;
    const top = opensDown ? rect.bottom + 6 : Math.max(viewportGap, rect.top - 336);
    setPosition({
      top,
      left: Math.min(rect.left, window.innerWidth - rect.width - viewportGap),
      width: rect.width,
    });
  };

  useEffect(() => {
    if (!open) return;
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 0);

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || dropdownRef.current?.contains(target)) return;
      setOpen(false);
    };

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [open]);

  const commitSelection = (option: SearchableSelectOption) => {
    if (option.disabled) return;
    onValueChange(option.value);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((current) => {
        if (filteredOptions.length === 0) return 0;
        return (current + direction + filteredOptions.length) % filteredOptions.length;
      });
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const option = filteredOptions[activeIndex];
      if (option) commitSelection(option);
    }
  };

  const dropdown =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={dropdownRef}
            className="z-[10001] rounded-lg border border-white/10 bg-[#111827] p-2 shadow-2xl"
            style={{
              position: "fixed",
              top: position.top,
              left: position.left,
              width: position.width,
              maxWidth: "calc(100vw - 24px)",
              boxShadow: "0 22px 50px rgba(0, 0, 0, 0.38)",
            }}
          >
            <div className="mb-2 flex h-9 items-center gap-2 rounded-md border border-white/10 bg-[#0c1014] px-2 text-[#8aa0b2]">
              <Search size={15} />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={handleInputKeyDown}
                placeholder={searchPlaceholder}
                className="h-full min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-[#627588]"
              />
            </div>
            <div id={listboxId} role="listbox" className="max-h-72 overflow-y-auto overscroll-contain pr-1">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-3 text-sm text-[#8aa0b2]">{emptyText}</div>
              ) : (
                filteredOptions.map((option, index) => {
                  const selected = option.value === value;
                  const active = index === activeIndex;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      disabled={option.disabled}
                      className="flex min-h-9 w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm text-[#d4e4f0] transition disabled:cursor-not-allowed disabled:opacity-45"
                      style={{ background: active ? "rgba(56, 189, 248, 0.13)" : selected ? "rgba(34, 197, 94, 0.11)" : "transparent" }}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => commitSelection(option)}
                    >
                      <span className="min-w-0 truncate">{option.label}</span>
                      {selected && <Check size={15} className="shrink-0 text-[#22c55e]" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          portalContainer || document.body,
        )
      : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={className}
        aria-label={ariaLabel || placeholder}
        aria-expanded={open}
        aria-controls={listboxId}
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          if (open) {
            setOpen(false);
            return;
          }
          openSelect();
        }}
        onKeyDown={(event) => {
          if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
            openSelect(event.key);
          }
        }}
        style={{
          alignItems: "center",
          background: "#111827",
          border: "1px solid rgba(255,255,255,0.13)",
          borderRadius: 6,
          color: selectedOption ? "white" : "#8aa0b2",
          cursor: disabled ? "not-allowed" : "pointer",
          display: "flex",
          fontSize: 14,
          gap: 8,
          height: 36,
          justifyContent: "space-between",
          minWidth: 0,
          opacity: disabled ? 0.55 : 1,
          padding: "0 10px",
          textAlign: "left",
          width: "100%",
          ...style,
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown size={16} style={{ flexShrink: 0, opacity: 0.7 }} />
      </button>
      {dropdown}
    </>
  );
}
