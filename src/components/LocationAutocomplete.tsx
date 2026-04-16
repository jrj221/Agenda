import React, { useState, useRef, useEffect } from "react";

const LOCATIONIQ_KEY = import.meta.env.VITE_LOCATIONIQ_KEY;

interface Suggestion {
	place_id: string;
	display_name: string;
}

interface LocationAutocompleteProps {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
}

export function LocationAutocomplete({ value, onChange, placeholder = "Add location..." }: LocationAutocompleteProps) {
	const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
	const [open, setOpen] = useState(false);
	const [activeIndex, setActiveIndex] = useState(-1);
	const debounceRef = useRef<number | null>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		function handleClickOutside(e: MouseEvent) {
			if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
				setOpen(false);
			}
		}
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	function fetchSuggestions(query: string) {
		if (!query.trim() || !LOCATIONIQ_KEY) {
			setSuggestions([]);
			setOpen(false);
			return;
		}
		if (debounceRef.current) clearTimeout(debounceRef.current);
		debounceRef.current = window.setTimeout(async () => {
			try {
				const res = await fetch(
					`https://api.locationiq.com/v1/autocomplete?key=${LOCATIONIQ_KEY}&q=${encodeURIComponent(query)}&limit=5&format=json`
				);
				if (!res.ok) return;
				const data: Suggestion[] = await res.json();
				setSuggestions(data);
				setOpen(data.length > 0);
				setActiveIndex(-1);
			} catch {
				setSuggestions([]);
			}
		}, 300);
	}

	function handleSelect(name: string) {
		onChange(name);
		setOpen(false);
		setSuggestions([]);
	}

	function handleKeyDown(e: React.KeyboardEvent) {
		if (!open || suggestions.length === 0) return;
		if (e.key === "ArrowDown") {
			e.preventDefault();
			setActiveIndex((i) => (i < suggestions.length - 1 ? i + 1 : 0));
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			setActiveIndex((i) => (i > 0 ? i - 1 : suggestions.length - 1));
		} else if (e.key === "Enter" && activeIndex >= 0) {
			e.preventDefault();
			handleSelect(suggestions[activeIndex].display_name);
		} else if (e.key === "Escape") {
			setOpen(false);
		}
	}

	return (
		<div className="location-autocomplete" ref={containerRef}>
			<input
				className="text-input"
				type="text"
				placeholder={placeholder}
				value={value}
				onChange={(e) => {
					onChange(e.target.value);
					fetchSuggestions(e.target.value);
				}}
				onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
				onKeyDown={handleKeyDown}
			/>
			{open && suggestions.length > 0 && (
				<ul className="location-suggestions">
					{suggestions.map((s, i) => (
						<li
							key={s.place_id}
							className={`location-suggestion ${i === activeIndex ? "location-suggestion--active" : ""}`}
							onMouseDown={() => handleSelect(s.display_name)}
							onMouseEnter={() => setActiveIndex(i)}
						>
							{s.display_name}
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
