"use client";

import { useEffect, useMemo, useState } from "react";

import {
  saveCurrentLifeGameStorage,
  syncLifeGameStorageFromSupabase,
} from "@/lib/life-game-storage";

type PrayerName =
| "Subuh"
| "Dzuhur"
| "Ashar"
| "Maghrib"
| "Isya";

type PrayerRecord = {
[key in PrayerName]: boolean;
};

type CustomPrayer = {
id: string;
name: string;
icon: string;
xp: number;
};

type CustomRecords = {
[date: string]: {
[prayerId: string]: boolean;
};
};

type HistoryItem = {
id: string;
activityId: string;
activity: string;
xp: number;
stat: string;
date: string;
};

const defaultPrayers: PrayerName[] = [
"Subuh",
"Dzuhur",
"Ashar",
"Maghrib",
"Isya",
];

const prayerIcons: Record<
PrayerName,
string
> = {
Subuh: "🌅",
Dzuhur: "☀️",
Ashar: "🌤️",
Maghrib: "🌇",
Isya: "🌙",
};

const prayerColors: Record<
PrayerName,
string
> = {
Subuh: "#7c6f9f",
Dzuhur: "#d49a5b",
Ashar: "#6f9b7b",
Maghrib: "#c87862",
Isya: "#5f7896",
};

function getTodayKey() {
const now = new Date();
const year = now.getFullYear();
const month = String(
now.getMonth() + 1
).padStart(2, "0");
const day = String(
now.getDate()
).padStart(2, "0");
return `${year}-${month}-${day}`;
}

function getDateKey(date: Date) {
const year =
date.getFullYear();
const month = String(
date.getMonth() + 1
).padStart(2, "0");
const day = String(
date.getDate()
).padStart(2, "0");
return `${year}-${month}-${day}`;
}

function createEmptyRecord(): PrayerRecord {
return {
Subuh: false,
Dzuhur: false,
Ashar: false,
Maghrib: false,
Isya: false,
};
}

function loadPrayerRecords(): Record<
string,
PrayerRecord
> {
const saved =
localStorage.getItem(
"life-game-prayers"
);
if (!saved) {
return {};
}
try {
const parsed = JSON.parse(saved);
if (
parsed &&
typeof parsed === "object" &&
!Array.isArray(parsed)
) {
return parsed;
}
return {};
} catch {
return {};
}
}

function loadCustomPrayers(): CustomPrayer[] {
const saved =
localStorage.getItem(
"life-game-custom-prayers"
);
if (!saved) {
return [];
}
try {
const parsed = JSON.parse(saved);
if (!Array.isArray(parsed)) {
return [];
}
return parsed.filter(
(item): item is CustomPrayer =>
item &&
typeof item.id === "string" &&
typeof item.name === "string" &&
typeof item.icon === "string" &&
typeof item.xp === "number" &&
item.xp > 0
);
} catch {
return [];
}
}

function loadCustomRecords(): CustomRecords {
const saved =
localStorage.getItem(
"life-game-custom-prayer-records"
);
if (!saved) {
return {};
}
try {
const parsed = JSON.parse(saved);
if (
parsed &&
typeof parsed === "object" &&
!Array.isArray(parsed)
) {
return parsed;
}
return {};
} catch {
return {};
}
}

function loadHistory(): HistoryItem[] {
const saved =
localStorage.getItem(
"life-game-history"
);
if (!saved) {
return [];
}
try {
const parsed = JSON.parse(saved);
if (Array.isArray(parsed)) {
return parsed;
}
return [];
} catch {
return [];
}
}

function saveHistory(
history: HistoryItem[]
) {
localStorage.setItem(
"life-game-history",
JSON.stringify(history)
);
}

function addHistory(
activityId: string,
activity: string,
xp: number,
selectedDate: string
) {
const history =
loadHistory();
const item: HistoryItem = {
id: `${Date.now()}-${Math.random()}`,
activityId,
activity,
xp,
stat: "Growth",
date: `${selectedDate}T12:00:00`,
};
saveHistory([
...history,
item,
]);
}

function removeHistory(
activityId: string
) {
const history =
loadHistory();
let foundIndex = -1;
for (
let index = history.length - 1;
index >= 0;
index--
) {
if (
history[index].activityId ===
activityId
) {
foundIndex = index;
break;
}
}
if (foundIndex === -1) {
return;
}
const updatedHistory =
history.filter(
(_, index) =>
index !== foundIndex
);
saveHistory(
updatedHistory
);
}

function updateXp(
amount: number
) {
const currentXp =
Number(
localStorage.getItem(
"life-game-xp"
) || "0"
);
const newXp = Math.max(
0,
currentXp + amount
);
localStorage.setItem(
"life-game-xp",
String(newXp)
);
}

function updateGrowth(
selectedDate: string,
amount: number
) {
const saved =
localStorage.getItem(
"life-game-daily-stats"
);
let dailyStats: Record<
string,
{
Energy: number;
Focus: number;
Growth: number;
}
> = {};
if (saved) {
try {
const parsed = JSON.parse(saved);
if (
parsed &&
typeof parsed === "object" &&
!Array.isArray(parsed)
) {
dailyStats = parsed;
}
} catch {
dailyStats = {};
}
}
const current =
dailyStats[selectedDate] || {
Energy: 0,
Focus: 0,
Growth: 0,
};
const updated = {
...dailyStats,
[selectedDate]: {
...current,
Growth: Math.max(
0,
Math.min(
100,
current.Growth + amount
)
),
},
};
localStorage.setItem(
"life-game-daily-stats",
JSON.stringify(updated)
);
}

function getLastSevenDays() {
const days: string[] = [];
const today = new Date();
for (
let index = 6;
index >= 0;
index--
) {
const date = new Date(
today
);
date.setDate(
today.getDate() - index
);
days.push(
getDateKey(date)
);
}
return days;
}

function formatShortDate(
dateKey: string
) {
return new Date(
`${dateKey}T12:00:00`
).toLocaleDateString(
"id-ID",
{
weekday: "short",
day: "numeric",
}
);
}

function formatFullDate(
dateKey: string
) {
return new Date(
`${dateKey}T12:00:00`
).toLocaleDateString(
"id-ID",
{
weekday: "long",
day: "numeric",
month: "long",
year: "numeric",
}
);
}

function getPrayerPercentage(
records: Record<
string,
PrayerRecord
>,
prayer: PrayerName
) {
const days =
getLastSevenDays();
if (days.length === 0) {
return 0;
}
const completed =
days.filter(
(day) =>
records[day]?.[prayer]
).length;
return Math.round(
(completed /
days.length) *
100
);
}

export default function Prayer() {
const [selectedDate, setSelectedDate] =
useState(getTodayKey());

const [records, setRecords] =
useState<
Record<string, PrayerRecord>
>({});

const [customPrayers, setCustomPrayers] =
useState<CustomPrayer[]>([]);

const [customRecords, setCustomRecords] =
useState<CustomRecords>({});

const [showForm, setShowForm] =
useState(false);

const [customName, setCustomName] =
useState("");

const [customIcon, setCustomIcon] =
useState("📖");

const [customXp, setCustomXp] =
useState("5");

const [hoveredDate, setHoveredDate] =
useState<string | null>(null);

useEffect(() => {
  let cancelled = false;

  async function initializePrayer() {
    await syncLifeGameStorageFromSupabase();

    if (cancelled) {
      return;
    }

    setRecords(loadPrayerRecords());
    setCustomPrayers(loadCustomPrayers());
    setCustomRecords(loadCustomRecords());
  }

  initializePrayer();

  return () => {
    cancelled = true;
  };
}, []);

const currentRecord =
records[selectedDate] ||
createEmptyRecord();

const currentCustomRecord =
customRecords[selectedDate] ||
{};

const completedDefaultCount =
defaultPrayers.filter(
(prayer) =>
currentRecord[prayer]
).length;

const completedCustomCount =
customPrayers.filter(
(prayer) =>
currentCustomRecord[
prayer.id
]
).length;

const totalCompleted =
completedDefaultCount +
completedCustomCount;

const totalAvailable =
defaultPrayers.length +
customPrayers.length;

const totalTodayXp =
defaultPrayers.reduce(
(total, prayer) =>
total +
(currentRecord[prayer]
? 5
: 0),
0
) +
customPrayers.reduce(
(total, prayer) =>
total +
(currentCustomRecord[
prayer.id
]
? prayer.xp
: 0),
0
);

async function toggleDefaultPrayer(
prayer: PrayerName
) {
const wasCompleted =
currentRecord[prayer];

const updatedRecord = {
...currentRecord,
[prayer]: !wasCompleted,
};

const updatedRecords = {
...records,
[selectedDate]:
updatedRecord,
};

setRecords(
updatedRecords
);

localStorage.setItem(
"life-game-prayers",
JSON.stringify(
updatedRecords
)
);

const activityId =
`prayer-${selectedDate}-${prayer}`;

if (!wasCompleted) {
updateXp(5);

updateGrowth(
selectedDate,
1
);

addHistory(
activityId,
`Shalat ${prayer}`,
5,
selectedDate
);
} else {
updateXp(-5);

updateGrowth(
selectedDate,
-1
);

removeHistory(
activityId
);
}

const persistenceResults = await Promise.all([
saveCurrentLifeGameStorage(
"life-game-prayers"
),
saveCurrentLifeGameStorage(
"life-game-history"
),
saveCurrentLifeGameStorage(
"life-game-xp"
),
saveCurrentLifeGameStorage(
"life-game-daily-stats"
),
]);

const failedPersistence =
persistenceResults.find(
(result) => !result.success
);

if (failedPersistence) {
console.error(
"Gagal menyimpan perubahan Prayer ke Supabase:",
failedPersistence
);
}

window.dispatchEvent(
new Event(
"life-game-updated"
)
);
}

async function toggleCustomPrayer(
prayer: CustomPrayer
) {
const wasCompleted =
Boolean(
currentCustomRecord[
prayer.id
]
);

const updatedDateRecord = {
...currentCustomRecord,
[prayer.id]:
!wasCompleted,
};

const updatedRecords = {
...customRecords,
[selectedDate]:
updatedDateRecord,
};

setCustomRecords(
updatedRecords
);

localStorage.setItem(
"life-game-custom-prayer-records",
JSON.stringify(
updatedRecords
)
);

const activityId =
`custom-prayer-${selectedDate}-${prayer.id}`;

if (!wasCompleted) {
updateXp(prayer.xp);

updateGrowth(
selectedDate,
1
);

addHistory(
activityId,
prayer.name,
prayer.xp,
selectedDate
);
} else {
updateXp(
-prayer.xp
);

updateGrowth(
selectedDate,
-1
);

removeHistory(
activityId
);
}

const persistenceResults = await Promise.all([
saveCurrentLifeGameStorage(
"life-game-custom-prayer-records"
),
saveCurrentLifeGameStorage(
"life-game-history"
),
saveCurrentLifeGameStorage(
"life-game-xp"
),
saveCurrentLifeGameStorage(
"life-game-daily-stats"
),
]);

const failedPersistence =
persistenceResults.find(
(result) => !result.success
);

if (failedPersistence) {
console.error(
"Gagal menyimpan perubahan Prayer ke Supabase:",
failedPersistence
);
}

window.dispatchEvent(
new Event(
"life-game-updated"
)
);
}

async function addCustomPrayer() {
const name =
customName.trim();

const xp =
Number(customXp);

if (
!name ||
!Number.isFinite(xp) ||
xp <= 0
) {
return;
}

const newPrayer: CustomPrayer = {
id: `${Date.now()}-${Math.random()}`,
name,
icon:
customIcon.trim() || "📖",
xp,
};

const updated = [
...customPrayers,
newPrayer,
];

setCustomPrayers(
updated
);

localStorage.setItem(
"life-game-custom-prayers",
JSON.stringify(updated)
);

const persistenceResult =
await saveCurrentLifeGameStorage(
"life-game-custom-prayers"
);

if (!persistenceResult.success) {
console.error(
"Gagal menyimpan custom prayer ke Supabase:",
persistenceResult
);
}

setCustomName("");
setCustomIcon("📖");
setCustomXp("5");
setShowForm(false);

window.dispatchEvent(
new Event(
"life-game-updated"
)
);
}

async function deleteCustomPrayer(
prayer: CustomPrayer
) {
const wasCompleted =
Boolean(
currentCustomRecord[
prayer.id
]
);

if (wasCompleted) {
updateXp(
-prayer.xp
);

updateGrowth(
selectedDate,
-1
);

removeHistory(
`custom-prayer-${selectedDate}-${prayer.id}`
);
}

const updatedPrayers =
customPrayers.filter(
(item) =>
item.id !== prayer.id
);

setCustomPrayers(
updatedPrayers
);

localStorage.setItem(
"life-game-custom-prayers",
JSON.stringify(updatedPrayers)
);

const updatedRecords = {
...customRecords,
};

for (const date of Object.keys(
updatedRecords
)) {
if (
updatedRecords[date]
) {
const {
[prayer.id]:
_removed,
...remaining
} =
updatedRecords[date];

updatedRecords[date] =
remaining;
}
}

setCustomRecords(
updatedRecords
);

localStorage.setItem(
"life-game-custom-prayer-records",
JSON.stringify(
updatedRecords
)
);

const persistenceResults = await Promise.all([
saveCurrentLifeGameStorage(
"life-game-custom-prayers"
),
saveCurrentLifeGameStorage(
"life-game-custom-prayer-records"
),
saveCurrentLifeGameStorage(
"life-game-history"
),
saveCurrentLifeGameStorage(
"life-game-xp"
),
saveCurrentLifeGameStorage(
"life-game-daily-stats"
),
]);

const failedPersistence =
persistenceResults.find(
(result) => !result.success
);

if (failedPersistence) {
console.error(
"Gagal menyimpan perubahan Prayer ke Supabase:",
failedPersistence
);
}

window.dispatchEvent(
new Event(
"life-game-updated"
)
);
}

function changeDate(
days: number
) {
const date = new Date(
`${selectedDate}T12:00:00`
);

date.setDate(
date.getDate() + days
);

setSelectedDate(
getDateKey(date)
);
}

function goToToday() {
setSelectedDate(
getTodayKey()
);
}

const formattedDate =
new Date(
`${selectedDate}T12:00:00`
).toLocaleDateString(
"id-ID",
{
weekday: "long",
day: "numeric",
month: "long",
year: "numeric",
}
);

const chartData =
useMemo(() => {
return getLastSevenDays().map(
(date) => ({
date,
label:
formatShortDate(
date
),
Subuh:
records[date]?.Subuh
? 100
: 0,
Dzuhur:
records[date]?.Dzuhur
? 100
: 0,
Ashar:
records[date]?.Ashar
? 100
: 0,
Maghrib:
records[date]?.Maghrib
? 100
: 0,
Isya:
records[date]?.Isya
? 100
: 0,
})
);
}, [records]);

const chartWidth = 700;
const chartHeight = 300;

const chartPadding = {
top: 25,
right: 25,
bottom: 45,
left: 45,
};

const innerWidth =
chartWidth -
chartPadding.left -
chartPadding.right;

const innerHeight =
chartHeight -
chartPadding.top -
chartPadding.bottom;

function getPointX(
index: number
) {
if (chartData.length <= 1) {
return (
chartPadding.left +
innerWidth / 2
);
}

return (
chartPadding.left +
(index /
(chartData.length - 1)) *
innerWidth
);
}

function getPointY(
value: number
) {
return (
chartPadding.top +
innerHeight -
(value / 100) *
innerHeight
);
}

function getPath(
prayer: PrayerName
) {
return chartData
.map((point, index) => {
const x =
getPointX(index);

const y =
getPointY(
point[prayer]
);

return `${
index === 0
? "M"
: "L"
} ${x} ${y}`;
})
.join(" ");
}

const prayerStats =
defaultPrayers.map(
(prayer) => ({
prayer,
percentage:
getPrayerPercentage(
records,
prayer
),
})
);

const weeklyTotal =
chartData.reduce(
(total, day) =>
total +
defaultPrayers.reduce(
(dayTotal, prayer) =>
dayTotal +
(day[prayer] === 100
? 1
: 0),
0
),
0
);

const weeklyMaximum =
chartData.length *
defaultPrayers.length;

const weeklyPercentage =
weeklyMaximum > 0
? Math.round(
(weeklyTotal /
weeklyMaximum) *
100
)
: 0;

const activeTooltip =
hoveredDate
? chartData.find(
(point) =>
point.date ===
hoveredDate
)
: null;

return (
<div>
{/* DATE NAVIGATION */}
<div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#f5f0e8] p-4">
<button
type="button"
onClick={() =>
changeDate(-1)
}
className="rounded-xl bg-[#ddd4c7] px-4 py-2 text-sm font-medium"
>
←
</button>

<div className="text-center">
<p className="text-sm font-semibold">
{formattedDate}
</p>

{selectedDate !==
getTodayKey() && (
<button
type="button"
onClick={goToToday}
className="mt-1 text-xs underline opacity-60"
>
Back to today
</button>
)}
</div>

<button
type="button"
onClick={() =>
changeDate(1)
}
className="rounded-xl bg-[#ddd4c7] px-4 py-2 text-sm font-medium"
>
→
</button>
</div>

{/* DAILY SUMMARY */}
<div className="mt-5 rounded-2xl bg-[#f5f0e8] p-4">
<div className="flex flex-wrap items-center justify-between gap-3">
<div>
<p className="text-sm opacity-50">
Daily worship
</p>

<p className="mt-1 text-xl font-bold">
{totalCompleted} /{" "}
{totalAvailable}
</p>
</div>

<span className="text-sm font-semibold opacity-60">
+{totalTodayXp} XP
</span>
</div>

<div className="mt-3 h-2 overflow-hidden rounded-full bg-[#ddd4c7]">
<div
className="h-full rounded-full bg-[#8f806d] transition-all"
style={{
width: `${
totalAvailable > 0
? (totalCompleted /
totalAvailable) *
100
: 0
}%`,
}}
/>
</div>
</div>

{/* FIVE DAILY PRAYERS */}
<div className="mt-6">
<div className="mb-3">
<p className="text-xs uppercase tracking-widest opacity-50">
Five daily prayers
</p>

<h3 className="mt-1 text-lg font-bold">
Shalat Wajib
</h3>
</div>

<div className="space-y-3">
{defaultPrayers.map(
(prayer) => {
const completed =
currentRecord[
prayer
];

return (
<button
key={prayer}
type="button"
onClick={() =>
toggleDefaultPrayer(
prayer
)
}
className={`flex w-full items-center justify-between rounded-2xl p-4 text-left transition ${
completed
? "bg-[#d8cec0]"
: "bg-[#f5f0e8]"
}`}
>
<div className="flex items-center gap-3">
<span className="text-xl">
{
prayerIcons[
prayer
]
}
</span>

<div>
<p className="font-semibold">
{prayer}
</p>

<p className="text-xs opacity-50">
+5 XP · +1 Growth
</p>
</div>
</div>

<span
className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
completed
? "bg-[#8f806d] text-white"
: "bg-[#ddd4c7]"
}`}
>
{completed
? "✓"
: ""}
</span>
</button>
);
}
)}
</div>
</div>

{/* PRAYER GRAPH */}
<div className="mt-7 rounded-3xl bg-white/60 p-5 shadow-sm sm:p-6">
<div className="mb-5">
<p className="text-xs uppercase tracking-widest opacity-50">
Statistics
</p>

<h3 className="mt-1 text-xl font-bold">
Prayer consistency
</h3>

<p className="mt-1 text-sm opacity-50">
Seven-day completion for each prayer.
</p>
</div>

<div className="relative overflow-x-auto">
<svg
viewBox={`0 0 ${chartWidth} ${chartHeight}`}
className="min-w-[620px] w-full"
role="img"
aria-label="Seven-day prayer consistency graph"
>
{/* GRID */}
{[0, 25, 50, 75, 100].map(
(value) => {
const y =
getPointY(value);

return (
<g key={value}>
<line
x1={
chartPadding.left
}
x2={
chartWidth -
chartPadding.right
}
y1={y}
y2={y}
stroke="#d8cec0"
strokeWidth="1"
/>

<text
x="8"
y={y + 4}
fontSize="11"
fill="#8f806d"
>
{value}%
</text>
</g>
);
}
)}

{/* X LABELS */}
{chartData.map(
(point, index) => (
<text
key={point.date}
x={getPointX(index)}
y={
chartHeight -
15
}
textAnchor="middle"
fontSize="11"
fill="#8f806d"
>
{point.label}
</text>
)
)}

{/* FIVE LINES */}
{defaultPrayers.map(
(prayer) => (
<g key={prayer}>
<path
d={getPath(
prayer
)}
fill="none"
stroke={
prayerColors[
prayer
]
}
strokeWidth="3"
strokeLinecap="round"
strokeLinejoin="round"
/>

{chartData.map(
(
point,
index
) => (
<circle
key={`${prayer}-${point.date}`}
cx={getPointX(
index
)}
cy={getPointY(
point[
prayer
]
)}
r="4"
fill={
prayerColors[
prayer
]
}
/>
)
)}
</g>
)
)}

{/* INTERACTIVE DATE AREAS */}
{chartData.map(
(point, index) => (
<rect
key={`hover-${point.date}`}
x={
index === 0
? getPointX(
index
)
: getPointX(
index
) -
(getPointX(
index
) -
getPointX(
index - 1
)) /
2
}
y={
chartPadding.top
}
width={
index === 0
? (getPointX(
1
) -
getPointX(
0
)) /
2
: index ===
chartData.length -
1
? (getPointX(
index
) -
getPointX(
index - 1
)) /
2
: getPointX(
index + 1
) -
getPointX(
index
) /
2 +
getPointX(
index
) -
getPointX(
index - 1
) /
2
}
height={
innerHeight
}
fill="transparent"
onMouseEnter={() =>
setHoveredDate(
point.date
)
}
onMouseLeave={() =>
setHoveredDate(
null
)
}
onClick={() =>
setHoveredDate(
point.date
)
}
style={{
cursor: "pointer",
}}
/>
)
)}
</svg>

{/* TOOLTIP */}
{activeTooltip && (
<div
className="pointer-events-none absolute left-1/2 top-4 z-10 w-[230px] -translate-x-1/2 rounded-2xl border border-[#d8cec0] bg-white p-4 shadow-lg"
role="status"
>
<p className="mb-3 text-sm font-bold">
{formatFullDate(
activeTooltip.date
)}
</p>

<div className="space-y-2">
{defaultPrayers.map(
(prayer) => {
const completed =
activeTooltip[
prayer
] === 100;

return (
<div
key={prayer}
className="flex items-center justify-between gap-3"
>
<div className="flex items-center gap-2">
<span
className="h-2.5 w-2.5 rounded-full"
style={{
backgroundColor:
prayerColors[
prayer
],
}}
/>

<span className="text-xs font-medium">
{
prayerIcons[
prayer
]
}{" "}
{prayer}
</span>
</div>

<span
className={`text-xs font-semibold ${
completed
? "opacity-100"
: "opacity-40"
}`}
>
{completed
? "✓ 100%"
: "✕ 0%"}
</span>
</div>
);
}
)}
</div>
</div>
)}
</div>

{/* LEGEND */}
<div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
{defaultPrayers.map(
(prayer) => (
<div
key={prayer}
className="flex items-center gap-2"
>
<span
className="h-3 w-3 rounded-full"
style={{
backgroundColor:
prayerColors[
prayer
],
}}
/>

<span className="text-xs font-medium">
{prayer}
</span>
</div>
)
)}
</div>

{/* WEEKLY TOTAL */}
<div className="mt-5 rounded-2xl bg-[#f5f0e8] p-4">
<div className="flex flex-wrap items-end justify-between gap-3">
<div>
<p className="text-xs opacity-50">
This week
</p>

<p className="mt-1 text-2xl font-bold">
{weeklyTotal} /{" "}
{weeklyMaximum}
</p>
</div>

<p className="text-xl font-bold">
{weeklyPercentage}%
</p>
</div>
</div>

{/* PER PRAYER STATS */}
<div className="mt-4 space-y-3">
{prayerStats.map(
({
prayer,
percentage,
}) => (
<div
key={prayer}
className="rounded-2xl bg-[#f5f0e8] p-3"
>
<div className="flex items-center justify-between gap-3">
<div className="flex items-center gap-2">
<span>
{
prayerIcons[
prayer
]
}
</span>

<span className="text-sm font-semibold">
{prayer}
</span>
</div>

<span className="text-sm font-bold">
{percentage}%
</span>
</div>

<div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#ddd4c7]">
<div
className="h-full rounded-full transition-all"
style={{
width: `${percentage}%`,
backgroundColor:
prayerColors[
prayer
],
}}
/>
</div>
</div>
)
)}
</div>
</div>

{/* CUSTOM WORSHIP */}
<div className="mt-7">
<div className="flex flex-wrap items-center justify-between gap-3">
<div>
<p className="text-xs uppercase tracking-widest opacity-50">
Personal
</p>

<h3 className="mt-1 text-lg font-bold">
Other Worship
</h3>
</div>

<button
type="button"
onClick={() =>
setShowForm(!showForm)
}
className="rounded-xl bg-[#8f806d] px-4 py-2 text-sm font-medium text-white"
>
{showForm
? "Cancel"
: "+ Add Worship"}
</button>
</div>

{showForm && (
<div className="mt-4 rounded-2xl bg-[#f5f0e8] p-4">
<div className="grid gap-3 sm:grid-cols-[70px_1fr_100px_auto]">
<input
type="text"
value={customIcon}
onChange={(event) =>
setCustomIcon(
event.target.value
)
}
aria-label="Icon"
className="rounded-xl border border-[#d8cec0] bg-white px-3 py-2 text-center text-lg outline-none focus:border-[#8f806d]"
/>

<input
type="text"
value={customName}
onChange={(event) =>
setCustomName(
event.target.value
)
}
placeholder="Example: Ngaji"
className="min-w-0 rounded-xl border border-[#d8cec0] bg-white px-3 py-2 text-sm outline-none focus:border-[#8f806d]"
/>

<input
type="number"
min="1"
value={customXp}
onChange={(event) =>
setCustomXp(
event.target.value
)
}
aria-label="XP"
className="rounded-xl border border-[#d8cec0] bg-white px-3 py-2 text-sm outline-none focus:border-[#8f806d]"
/>

<button
type="button"
onClick={
addCustomPrayer
}
className="rounded-xl bg-[#8f806d] px-4 py-2 text-sm font-medium text-white"
>
Save
</button>
</div>

<p className="mt-2 text-xs opacity-50">
Custom worship gives +1 Growth when completed.
</p>
</div>
)}

<div className="mt-4 space-y-3">
{customPrayers.length ===
0 ? (
<div className="rounded-2xl bg-[#f5f0e8] p-5 text-center">
<p className="text-sm opacity-50">
No custom worship yet.
</p>

<p className="mt-1 text-sm font-semibold">
Add things like Ngaji, Tahajud, or Dhuha.
</p>
</div>
) : (
customPrayers.map(
(prayer) => {
const completed =
Boolean(
currentCustomRecord[
prayer.id
]
);

return (
<div
key={prayer.id}
className={`flex items-center justify-between gap-3 rounded-2xl p-4 ${
completed
? "bg-[#d8cec0]"
: "bg-[#f5f0e8]"
}`}
>
<button
type="button"
onClick={() =>
toggleCustomPrayer(
prayer
)
}
className="flex min-w-0 flex-1 items-center gap-3 text-left"
>
<span className="text-xl">
{prayer.icon}
</span>

<div className="min-w-0">
<p className="truncate font-semibold">
{prayer.name}
</p>

<p className="mt-1 text-xs opacity-50">
+{prayer.xp} XP · +1 Growth
</p>
</div>
</button>

<div className="flex shrink-0 items-center gap-2">
<span
className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
completed
? "bg-[#8f806d] text-white"
: "bg-[#ddd4c7]"
}`}
>
{completed
? "✓"
: ""}
</span>

<button
type="button"
onClick={() =>
deleteCustomPrayer(
prayer
)
}
className="rounded-lg bg-[#ddd4c7] px-3 py-2 text-xs font-medium"
>
Delete
</button>
</div>
</div>
);
}
)
)}
</div>
</div>
</div>
);
}