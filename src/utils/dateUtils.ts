export function timeToMins(t: string | undefined): number {
	if (!t) return 0;
	const [h, m] = t.split(":").map(Number);
	return h * 60 + (m || 0);
}

export function formatDisplayDate(dateStr: string) {
	if (!dateStr) return "Undated";
	const [year, month, day] = dateStr.split("-");
	const d = new Date(Number(year), Number(month) - 1, Number(day));
	return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

export function generateDateRangeArray(start: string, end: string) {
	const dates = [];
	const [sYear, sMonth, sDay] = start.split("-");
	const [eYear, eMonth, eDay] = end.split("-");
	let curr = new Date(Number(sYear), Number(sMonth) - 1, Number(sDay));
	const endDateNode = new Date(Number(eYear), Number(eMonth) - 1, Number(eDay));
	while (curr <= endDateNode) {
		const y = curr.getFullYear();
		const m = String(curr.getMonth() + 1).padStart(2, "0");
		const d = String(curr.getDate()).padStart(2, "0");
		dates.push(`${y}-${m}-${d}`);
		curr.setDate(curr.getDate() + 1);
	}
	return dates;
}

export function parseDateString(ds: string | null | undefined): Date | null {
	if (!ds) return null;
	const [y, m, d] = ds.split('-');
	return new Date(Number(y), Number(m)-1, Number(d));
}

export function formatDateObj(d: Date | null): string {
	if (!d) return "";
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${day}`;
}
