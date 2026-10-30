"use strict";
const ARCANA = window.ARCANA_DATA || {};
function recolorInlineSvg(svg) {
	if (!svg || svg.nodeName.toLowerCase() !== "svg") return svg;
	svg.style.setProperty("color", "var(--foreground)");
	svg.style.setProperty("fill", "var(--foreground)");
	svg.querySelectorAll("style").forEach(style => {
		style.textContent = style.textContent.replace(/fill\s*:\s*(?!none\b)[^;}]+/gi, "fill:var(--foreground) !important").replace(/stroke\s*:\s*(?!none\b)[^;}]+/gi, "stroke:var(--foreground) !important");
	});
	const paintable = svg.querySelectorAll("path, rect, circle, ellipse, polygon, polyline, line, use, text");
	paintable.forEach(node => {
		const fill = (node.getAttribute("fill") || "").trim().toLowerCase();
		const stroke = (node.getAttribute("stroke") || "").trim().toLowerCase();
		const style = (node.getAttribute("style") || "");
		const inlineFillNone = /(?:^|;)\s*fill\s*:\s*none\b/i.test(style);
		const inlineStrokeNone = /(?:^|;)\s*stroke\s*:\s*none\b/i.test(style);
		if (fill !== "none" && !inlineFillNone) {
			node.style.setProperty("fill", "var(--foreground)", "important");
		}
		if (stroke && stroke !== "none" && !inlineStrokeNone) {
			node.style.setProperty("stroke", "var(--foreground)", "important");
		}
	});
	svg.querySelectorAll("[fill]").forEach(node => {
		if ((node.getAttribute("fill") || "").trim().toLowerCase() !== "none") {
			node.style.setProperty("fill", "var(--foreground)", "important");
		}
	});
	svg.querySelectorAll("[stroke]").forEach(node => {
		if ((node.getAttribute("stroke") || "").trim().toLowerCase() !== "none") {
			node.style.setProperty("stroke", "var(--foreground)", "important");
		}
	});
	const forceStyle = document.createElementNS("http://www.w3.org/2000/svg", "style");
	forceStyle.textContent = `
		path, rect, circle, ellipse, polygon, polyline, line, use, text {
			fill: var(--foreground) !important;
		}
		[fill="none"] { fill: none !important; }
		[stroke="none"] { stroke: none !important; }
	`;
	svg.appendChild(forceStyle);
	return svg;
}
async function inlineSvgHost(host) {
	if (!host || host.dataset.svgInlined === "true") return host;
	const src = host.dataset.svg;
	if (!src) return host;
	try {
		const response = await fetch(src, {
			cache: "no-store"
		});
		if (!response.ok) throw new Error(`SVG HTTP ${response.status}`);
		const svgText = await response.text();
		const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
		const svg = doc.documentElement;
		if (!svg || svg.nodeName.toLowerCase() !== "svg") {
			throw new Error("SVG non valido");
		}
		if (host.className) svg.setAttribute("class", host.className);
		for (const name of ["id", "role", "aria-hidden", "aria-label"]) {
			const value = host.getAttribute(name);
			if (value !== null) svg.setAttribute(name, value);
		}
		svg.style.display = "block";
		svg.dataset.svgInlined = "true";
		const imported = document.importNode(svg, true);
		if (host.classList.contains("stars-background")) {
			const viewBox = (imported.getAttribute("viewBox") || "0 0 537 300.19").trim().split(/\s+/).map(Number);
			const tileWidth = viewBox[2] || 537;
			const tileHeight = viewBox[3] || 300.19;
			const backgroundSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
			backgroundSvg.setAttribute("class", host.className);
			backgroundSvg.setAttribute("aria-hidden", "true");
			backgroundSvg.setAttribute("viewBox", `0 0 ${window.innerWidth} ${window.innerHeight}`);
			backgroundSvg.setAttribute("preserveAspectRatio", "none");
			backgroundSvg.style.display = "block";
			backgroundSvg.dataset.svgInlined = "true";
			const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
			const pattern = document.createElementNS("http://www.w3.org/2000/svg", "pattern");
			pattern.setAttribute("id", "stars-pattern");
			pattern.setAttribute("patternUnits", "userSpaceOnUse");
			pattern.setAttribute("width", String(tileWidth));
			pattern.setAttribute("height", String(tileHeight));
			imported.querySelectorAll(":scope > defs > *").forEach(node => {
				defs.appendChild(document.importNode(node, true));
			});
			imported.querySelectorAll(":scope > *:not(defs)").forEach(node => {
				pattern.appendChild(document.importNode(node, true));
			});
			defs.appendChild(pattern);
			backgroundSvg.appendChild(defs);
			const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
			rect.setAttribute("x", "0");
			rect.setAttribute("y", "0");
			rect.setAttribute("width", String(window.innerWidth));
			rect.setAttribute("height", String(window.innerHeight));
			rect.setAttribute("fill", "url(#stars-pattern)");
			backgroundSvg.appendChild(rect);
			recolorInlineSvg(backgroundSvg);
			rect.style.setProperty("fill", "url(#stars-pattern)", "important");
			host.replaceWith(backgroundSvg);
			const resizeStars = () => {
				const width = window.innerWidth;
				const height = window.innerHeight;
				backgroundSvg.setAttribute("viewBox", `0 0 ${width} ${height}`);
				rect.setAttribute("width", String(width));
				rect.setAttribute("height", String(height));
			};
			window.addEventListener("resize", resizeStars, {
				passive: true
			});
			return backgroundSvg;
		}
		recolorInlineSvg(imported);
		host.replaceWith(imported);
		return imported;
	}
	catch (error) {
		console.error("Impossibile incorporare SVG:", src, error);
		return host;
	}
}
async function inlineStaticSvgs() {
	const hosts = document.querySelectorAll(".svg-host[data-svg]");
	await Promise.all([...hosts].map(inlineSvgHost));
}
const dateInput = document.getElementById("birth-date");
const dateDigits = document.querySelectorAll(".date-digit");
const dateError = document.getElementById("date-error");
let dateErrorTimer;
function showDateError(message) {
	dateError.textContent = message;
	dateError.classList.add("is-visible");
	clearTimeout(dateErrorTimer);
	dateErrorTimer = setTimeout(() => {
		dateError.classList.remove("is-visible");
	}, 2500);
}
const methodButtons = document.querySelectorAll(".method-button");
const modal = document.getElementById("arcana-modal");
const modalClose = document.getElementById("modal-close");
const arcanaTitle = document.getElementById("arcana-title");
const arcanaName = document.getElementById("arcana-name");
const arcanaText = document.getElementById("arcana-text");
const modalInfo = document.getElementById("modal-info");
const methodInfoView = document.getElementById("method-info-view");
const methodInfoTitle = document.getElementById("method-info-title");
const methodInfoText = document.getElementById("method-info-text");
const methodInfoBack = document.getElementById("method-info-back");
const readingGrid = document.getElementById("reading-grid");
let currentMethod = null;
let cameFromReading = false;
let readingTitle = "";
let viewBeforeInfo = "card";
function showMethodInfo() {
	if (!currentMethod) return;
	const description = (window.METHOD_DESCRIPTIONS || {})[currentMethod];
	if (typeof description !== "string" || !description.trim()) {
		console.error("Descrizione non disponibile per il metodo:", currentMethod);
		return;
	}
	const methodNames = {
		simple: "Metodo con somma semplice",
		split: "Metodo con divisione dell'anno",
		full: "Metodo con somma completa",
		soul: "Metodo con Personalità e Anima",
		complete: "Metodo con lettura completa"
	};
	methodInfoTitle.textContent = methodNames[currentMethod] || "Informazioni sul metodo";
	methodInfoText.textContent = description;
	viewBeforeInfo = modal.dataset.view;
	modal.dataset.view = "info";
	modalInfo.setAttribute("aria-expanded", "true");
	methodInfoView.scrollTop = 0;
	methodInfoBack.focus();
}
function hideMethodInfo() {
	methodInfoText.scrollTop = 0;
	modal.dataset.view = viewBeforeInfo;
	modalInfo.setAttribute("aria-expanded", "false");
	modalInfo.focus();
}
function updateDateDigits(value) {
	dateDigits.forEach((digit, index) => {
		digit.textContent = value[index] || "";
	});
}
function updateCustomSelection() {
	const start = dateInput.selectionStart ?? 0;
	const end = dateInput.selectionEnd ?? start;
	dateDigits.forEach((d, i) => d.classList.toggle("is-selected", i >= start && i < end));
}
function updateCustomCaret() {
	let caret = document.querySelector(".date-caret");
	if (!caret) {
		caret = document.createElement("span");
		caret.className = "date-caret";
		dateInput.parentElement.appendChild(caret);
	}
	const pos = dateInput.selectionStart ?? 0;
	const wrapper = dateInput.closest(".date-input-wrapper");
	const w = wrapper.clientWidth / 8;
	const inset = w * 0.2;
	caret.style.left = `${Math.min(Math.max(pos * w, inset), wrapper.clientWidth - inset)}px`;
	caret.style.top = "25%";
	caret.style.height = "50%";
	caret.style.display = dateInput === document.activeElement ? "block" : "none";
}
function formatDateInput(value) {
	return value.replace(/\D/g, "").slice(0, 8);
}
function fitDateText() {
	if (!dateInput) return;
	const wrapper = dateInput.closest(".date-input-wrapper");
	if (!wrapper) return;
	const width = wrapper.clientWidth;
	if (!width) return;
	const styles = getComputedStyle(dateInput);
	const canvas = fitDateText.canvas || (fitDateText.canvas = document.createElement("canvas"));
	const ctx = canvas.getContext("2d");
	ctx.font = `${styles.fontWeight} ${styles.fontSize} ${styles.fontFamily}`;
	const digitWidth = ctx.measureText("0").width;
	if (!digitWidth) return;
	const target = width;
	const current = digitWidth * 8;
	const size = parseFloat(styles.fontSize) * target / current;
	dateInput.style.fontSize = `${size}px`;
}
function parseDate(value) {
	const match = value.match(/^(\d{2})(\d{2})(\d{4})$/);
	if (!match) return null;
	const day = Number(match[1]);
	const month = Number(match[2]);
	const year = Number(match[3]);
	const date = new Date(year, month - 1, day);
	if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
	return {
		day,
		month,
		year,
		date
	};
}
function getValidDate() {
	const parsed = parseDate(dateInput.value);
	if (!parsed) {
		showDateError("Inserisci una data valida.");
		return null;
	}
	dateError.textContent = "";
	return parsed;
}
function calculateByDigits(date) {
	const numbers = `${date.day}${date.month}${date.year}`;
	let total = 0;
	for (const digit of numbers) total += Number(digit);
	while (total > 22) {
		total = String(total).split("").reduce((sum, digit) => sum + Number(digit), 0);
	}
	return total;
}
function calculateBySplitYearSum(date) {
	const yearFirst = String(date.year).slice(0, 2);
	const yearSecond = String(date.year).slice(2, 4);
	let total = date.day + date.month + Number(yearFirst) + Number(yearSecond);
	if (total >= 100) {
		const digits = String(total);
		total = Number(digits.slice(0, 2)) + Number(digits.slice(2));
	}
	while (total > 21) {
		total = String(total).split("").reduce((sum, digit) => sum + Number(digit), 0);
	}
	if (total === 19) {
		return [19, 10, 1];
	}
	const pairs = {
		1: 10,
		2: 20,
		3: 12,
		4: 13,
		5: 14,
		6: 15,
		7: 16,
		8: 17,
		9: 18
	};
	if (total < 10) {
		return [pairs[total], total];
	}
	const companion = String(total).split("").reduce((sum, digit) => sum + Number(digit), 0);
	return [total, companion];
}
function calculateByFullSum(date) {
	let total = date.day + date.month + date.year;
	while (total > 22) {
		total = String(total).split("").reduce((sum, digit) => sum + Number(digit), 0);
	}
	return total;
}
function calculateByPersonalitySoul(date) {
	const total = date.day + date.month + date.year;
	let result = String(total).split("").reduce((sum, digit) => sum + Number(digit), 0);
	while (result > 22) {
		result = String(result).split("").reduce((sum, digit) => sum + Number(digit), 0);
	}
	if (result < 10) {
		return [result, result];
	}
	else {
		let reduced = String(result).split("").reduce((sum, digit) => sum + Number(digit), 0);
		while (reduced === 10) {
			reduced = String(reduced).split("").reduce((sum, digit) => sum + Number(digit), 0);
		}
		return [result, reduced];
	}
}
function calculateFullLecture(date) {
	const [personality, soul] = calculateByPersonalitySoul(date);
	const majorArcana = calculateByFullSum(date);
	const constellations = {
		1: [1, 10, 19],
		2: [2, 11, 20],
		3: [3, 12, 21],
		4: [4, 13, 22],
		5: [5, 14],
		6: [6, 15],
		7: [7, 16],
		8: [8, 17],
		9: [9, 18]
	};
	const hiddenFactorTable = {
		1: [10, 19],
		2: [11, 20],
		3: [12, 21],
		4: [13, 22],
		5: [14],
		6: [15],
		7: [16],
		8: [17],
		9: [18],
		10: [19],
		11: [20],
		12: [21],
		13: [22],
		14: [],
		15: [],
		16: [],
		17: [],
		18: [],
		19: [],
		20: [11],
		21: [12],
		22: [13]
	};
	const hiddenCards = hiddenFactorTable[personality] ?? [];
	return {
		majorArcana,
		personality,
		soul,
		constellation: constellations[soul],
		hiddenCards,
		hiddenCard: hiddenCards[0] ?? null
	};
}
function calculateArcana(date, method) {
	switch (method) {
		case "simple":
			return calculateByDigits(date);
		case "split":
			return calculateBySplitYearSum(date);
		case "full":
			return calculateByFullSum(date);
		default:
			throw new Error(`Metodo sconosciuto: ${method}`);
	}
}
function buildSoulGroups(date) {
	const [personality, soul] = calculateByPersonalitySoul(date);
	return [{
		title: "Personalità",
		numbers: [personality]
	},
	{
		title: "Anima",
		numbers: [soul]
	}];
}
function buildCompleteGroups(date) {
	const result = calculateFullLecture(date);
	return [{
		title: "Personalità",
		numbers: [result.personality]
	},
	{
		title: "Anima",
		numbers: [result.soul]
	},
	{
		title: "Costellazione",
		numbers: result.constellation
	},
	{
		title: result.hiddenCards.length > 1 ? "Carte nascoste" : "Carta nascosta",
		numbers: result.hiddenCards
	}];
}
function updateInfoButton() {
	const hasInfo = Boolean(currentMethod) && typeof window.METHOD_DESCRIPTIONS?.[currentMethod] === "string";
	modal.classList.toggle("has-info", hasInfo);
}
function openModal() {
	modal.classList.add("is-open");
	modal.setAttribute("aria-hidden", "false");
	document.body.style.overflow = "hidden";
	modalClose.focus();
}
function closeModal() {
	modal.classList.remove("is-open", "is-long-description");
	modal.setAttribute("aria-hidden", "true");
	document.body.style.overflow = "";
	cameFromReading = false;
}
function handleClose() {
	if (cameFromReading) {
		cameFromReading = false;
		arcanaTitle.textContent = readingTitle;
		arcanaName.textContent = "";
		modal.classList.remove("is-long-description");
		modal.dataset.view = "reading";
		modalClose.focus();
		return;
	}
	closeModal();
}
async function showArcana(number, fromReading = false) {
	const arcana = ARCANA[number] || (number === 22 ? ARCANA[0] : null);
	if (!arcana) return;
	arcanaTitle.textContent = `Arcano Maggiore ${arcana.roman}`;
	arcanaName.textContent = arcana.name;
	const host = document.createElement("div");
	host.id = "arcana-image";
	host.className = "arcana-image svg-host";
	host.dataset.svg = `res/tarots/${arcana.roman}.svg`;
	host.setAttribute("aria-hidden", "true");
	const current = document.getElementById("arcana-image");
	if (current) current.replaceWith(host);
	await inlineSvgHost(host);
	arcanaText.textContent = arcana.description;
	modal.classList.toggle("is-long-description", arcana.description.length > 420);
	cameFromReading = fromReading;
	modalInfo.setAttribute("aria-expanded", "false");
	modal.dataset.view = "card";
	document.querySelector(".arcana-description").scrollTop = 0;
	updateInfoButton();
	openModal();
}
async function showReading(mode, title, groups) {
	cameFromReading = false;
	readingTitle = title;
	arcanaTitle.textContent = title;
	arcanaName.textContent = "";
	modal.dataset.reading = mode;
	readingGrid.replaceChildren();
	let total = 0;
	const loading = [];
	for (const group of groups) {
		const numbers = group.numbers.filter(n => ARCANA[n] || n === 22);
		if (!numbers.length) continue;
		const column = document.createElement("div");
		column.className = "reading-column";
	column.style.setProperty("--n", numbers.length);
	total += numbers.length;
		const heading = document.createElement("h2");
		heading.className = "reading-title";
		heading.textContent = group.title;
		const row = document.createElement("div");
		row.className = "reading-row";
		numbers.forEach((number, index) => {
			const arcana = ARCANA[number] || ARCANA[0];
			const label = numbers.length > 1 ? `${group.title} ${index + 1}` : group.title;
			const card = document.createElement("button");
			card.type = "button";
			card.className = "reading-card";
			card.setAttribute("aria-label", `Apri ${arcana.name}: ${label}`);
			const image = document.createElement("div");
			image.className = "reading-card-image";
			const host = document.createElement("div");
			host.className = "svg-host";
			host.dataset.svg = `res/tarots/${arcana.roman}.svg`;
			host.setAttribute("aria-hidden", "true");
			image.appendChild(host);
			card.appendChild(image);
			card.addEventListener("click", () => showArcana(number, true));
			row.appendChild(card);
			loading.push(inlineSvgHost(host));
		});
		column.append(heading, row);
		readingGrid.appendChild(column);
	}
	readingGrid.style.setProperty("--total", total);
	await Promise.all(loading);
	modal.classList.remove("is-long-description");
	modalInfo.setAttribute("aria-expanded", "false");
	modal.dataset.view = "reading";
	updateInfoButton();
	openModal();
}
dateInput.addEventListener("input", event => {
	dateError.classList.remove("is-visible");
	clearTimeout(dateErrorTimer);
	const input = event.target;
	const rawValue = input.value;
	const rawStart = input.selectionStart ?? rawValue.length;
	const digitPosition = rawValue.slice(0, rawStart).replace(/\D/g, "").length;
	const formatted = formatDateInput(rawValue);
	if (formatted !== rawValue) {
		input.value = formatted;
		const nextPosition = Math.min(digitPosition, formatted.length);
		input.setSelectionRange(nextPosition, nextPosition);
	}
	updateDateDigits(input.value);
	dateError.textContent = input.value.length === 8 ? (getValidDate() ? "" : "Inserisci una data valida.") : "";
	const date = parseDate(event.target.value);
	methodButtons.forEach(button => {
		button.disabled = !date;
	});
});
dateInput.addEventListener("paste", event => event.preventDefault());
dateInput.addEventListener("keydown", event => {
	if (event.key === "Enter") methodButtons[0]?.focus();
});
methodButtons.forEach(button => {
	button.addEventListener("click", async () => {
		currentMethod = button.dataset.method;
		const date = getValidDate();
		if (!date) {
			dateInput.focus();
			return;
		}
		try {
			if (button.dataset.method === "split") {
				const cards = calculateBySplitYearSum(date);
				await showReading("birth-cards", "Divisione dell'anno", cards.map((number, index) => ({
					title: ["Prima carta", "Seconda carta", "Terza carta"][index],
					numbers: [number]
				})));
				return;
			}
			if (button.dataset.method === "soul") {
				await showReading("soul", "Personalità e Anima", buildSoulGroups(date));
				return;
			}
			if (button.dataset.method === "complete") {
				await showReading("complete", "Lettura completa", buildCompleteGroups(date));
				return;
			}
			await showArcana(calculateArcana(date, button.dataset.method));
		}
		catch (error) {
			console.error(error);
			showDateError("Si è verificato un errore nel calcolo.");
		}
	});
	button.disabled = true;
});
modalClose.addEventListener("click", handleClose);
modalInfo.addEventListener("click", showMethodInfo);
methodInfoBack.addEventListener("click", hideMethodInfo);
updateDateDigits(dateInput.value);
function syncMethodButtons() {
	const date = parseDate(dateInput.value);
	methodButtons.forEach(button => {
		button.disabled = !date;
	});
}
syncMethodButtons();
window.addEventListener("pageshow", syncMethodButtons);
["input", "keyup", "click", "select", "focus", "blur"].forEach(e => dateInput.addEventListener(e, () => {
	updateCustomSelection();
	updateCustomCaret();
}));
document.addEventListener("selectionchange", () => {
	if (document.activeElement === dateInput) {
		updateCustomSelection();
		updateCustomCaret();
	}
});
fitDateText();
window.addEventListener("resize", fitDateText);
if (window.ResizeObserver) {
	const dateWrapper = dateInput.closest(".date-input-wrapper");
	if (dateWrapper) new ResizeObserver(fitDateText).observe(dateWrapper);
}
inlineStaticSvgs();
document.addEventListener("contextmenu", event => {
	event.preventDefault();
});