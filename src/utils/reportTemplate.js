export const generateHTMLReport = (data) => {
  const { profile, readings, records } = data;
  const medical = profile.medicalInfo;

  const stats = {
    hr: { min: Infinity, max: -Infinity, sum: 0, count: 0 },
    sleep: { sum: 0, count: 0 },
  };

  const categorized = { heart_rate: [], sleep: [], mood: [], pain: [] };

  readings.forEach((r) => {
    if (categorized[r.readingType]) categorized[r.readingType].push(r);
    if (r.readingType === "heart_rate") {
      stats.hr.min = Math.min(stats.hr.min, r.value);
      stats.hr.max = Math.max(stats.hr.max, r.value);
      stats.hr.sum += r.value;
      stats.hr.count++;
    } else if (r.readingType === "sleep") {
      stats.sleep.sum += r.value;
      stats.sleep.count++;
    }
  });

  const avgHr =
    stats.hr.count > 0 ? Math.round(stats.hr.sum / stats.hr.count) : "--";
  const avgSleep =
    stats.sleep.count > 0
      ? (stats.sleep.sum / stats.sleep.count).toFixed(1)
      : "--";

  const formatTimestamp = (ts) =>
    new Date(ts).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

  const renderTable = (
    title,
    icon,
    data,
    colorClass,
    suffix = "",
    moodMap = null,
  ) => {
    if (!data || data?.length === 0) return "";
    return `
      <div class="flex flex-col h-full">
        <h3 class="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3 px-1">
          <span>${icon}</span> ${title}
        </h3>
        <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex-grow">
          <table class="w-full text-left border-collapse">
            <tbody class="divide-y divide-slate-100">
              ${data
                .slice(0, 5)
                .map(
                  (r) => `
                <tr class="hover:bg-slate-50 transition-colors">
                  <td class="py-3 px-4 text-[11px] text-slate-500 font-medium">${formatTimestamp(r.timestamp)}</td>
                  <td class="py-3 px-4 text-sm font-bold ${colorClass} text-right">
                    ${moodMap ? moodMap[r.value] || r.value : r.value}<span class="text-[10px] ml-1 opacity-70 font-normal text-slate-400">${suffix}</span>
                  </td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  };

  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SWASTHYA TWIN | Health Report</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
      body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #f1f5f9; }
      .glass-card { background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px); }
      @media print { body { background: white; padding: 0; } .no-print { display: none; } .shadow-2xl { shadow: none; } }
    </style>
  </head>
  <body class="py-10 px-4">
    <div class="max-w-4xl mx-auto shadow-2xl rounded-[40px] overflow-hidden border border-white">
      
      <div class="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-10 text-white relative">
        <div class="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div>
            <div class="flex items-center gap-2 mb-6">
               <div class="w-8 h-8 bg-teal-400 rounded-lg flex items-center justify-center">
                 <div class="w-4 h-4 bg-slate-900 rounded-sm rotate-45"></div>
               </div>
               <h1 class="text-xl font-extrabold tracking-tighter italic">SWASTHYA<span class="text-teal-400">TWIN</span></h1>
            </div>
            <h2 class="text-5xl font-extrabold tracking-tight mb-3">${profile.name}</h2>
            <div class="flex flex-wrap gap-3">
              <span class="bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-semibold border border-white/10">Age: ${profile.age || "--"}</span>
              <span class="bg-red-500/20 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-semibold border border-red-500/20 text-red-300">Blood: ${medical.bloodType}</span>
              <span class="bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-semibold border border-white/10 text-slate-300">${profile.relation}</span>
            </div>
          </div>
          <div class="flex flex-col items-end gap-3">
            <div class="flex gap-2">
              <span class="bg-red-500 text-[10px] font-black uppercase px-2 py-1 rounded-md tracking-wider">Restricted</span>
              <span class="bg-teal-500 text-[10px] font-black uppercase px-2 py-1 rounded-md tracking-wider">Clinical Grade</span>
            </div>
            <p class="text-slate-400 text-[10px] font-mono uppercase tracking-widest bg-black/20 p-2 rounded">ID: ${profile.localId.slice(-12).toUpperCase()}</p>
          </div>
        </div>
      </div>

      <div class="bg-white p-8 md:p-12 space-y-12">
        
        <section>
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Vital Matrix</h3>
            <div class="h-px flex-grow ml-4 bg-slate-100"></div>
          </div>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="bg-slate-50 p-6 rounded-[24px] border border-slate-100 hover:border-teal-200 transition-all group">
              <p class="text-[10px] font-bold text-slate-400 uppercase mb-2 group-hover:text-teal-600">Avg Heart Rate</p>
              <div class="flex items-baseline gap-1">
                <span class="text-3xl font-extrabold text-slate-900">${avgHr}</span>
                <span class="text-xs font-bold text-slate-400 italic">bpm</span>
              </div>
            </div>
            <div class="bg-slate-50 p-6 rounded-[24px] border border-slate-100 hover:border-indigo-200 transition-all group">
              <p class="text-[10px] font-bold text-slate-400 uppercase mb-2 group-hover:text-indigo-600">Sleep Score</p>
              <div class="flex items-baseline gap-1">
                <span class="text-3xl font-extrabold text-slate-900">${avgSleep}</span>
                <span class="text-xs font-bold text-slate-400 italic">hrs</span>
              </div>
            </div>
            <div class="bg-slate-50 p-6 rounded-[24px] border border-slate-100 hover:border-orange-200 transition-all group">
              <p class="text-[10px] font-bold text-slate-400 uppercase mb-2 group-hover:text-orange-600">Range (Min/Max)</p>
              <div class="flex items-baseline gap-1">
                <span class="text-2xl font-extrabold text-slate-900">${stats.hr.min}/${stats.hr.max}</span>
              </div>
            </div>
            <div class="bg-rose-50 p-6 rounded-[24px] border border-rose-100 group">
              <p class="text-[10px] font-bold text-rose-400 uppercase mb-2">Primary Risk</p>
              <p class="text-sm font-extrabold text-rose-700 truncate">${medical.allergies[0] || "No Alerts"}</p>
            </div>
          </div>
        </section>

        <section>
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Clinical Summaries</h3>
            <div class="h-px flex-grow ml-4 bg-slate-100"></div>
          </div>
          <div class="grid gap-4">
            ${
              records?.length > 0
                ? records
                    .slice(0, 3)
                    .map(
                      (rec) => `
              <div class="relative pl-6 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-teal-500 before:rounded-full bg-slate-50/50 p-6 rounded-r-2xl border border-slate-100">
                <div class="flex justify-between items-center mb-2">
                  <h4 class="text-sm font-extrabold text-slate-900">${rec.title}</h4>
                  <span class="text-[10px] font-bold text-slate-400 bg-white border px-2 py-1 rounded-md">
                    ${new Date(rec.recordDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </span>
                </div>
                <p class="text-sm text-slate-600 leading-relaxed italic">
                  "${typeof rec.aiAnalysis === "string" ? JSON.parse(rec.aiAnalysis).summary : rec.aiAnalysis?.summary || "Analyzing records..."}"
                </p>
              </div>
            `,
                    )
                    .join("")
                : `<div class="bg-slate-50 border-2 border-dashed border-slate-200 p-8 rounded-3xl text-center text-slate-400 text-sm">No historical data available.</div>`
            }
          </div>
        </section>

        <section>
          <div class="flex items-center justify-between mb-8">
            <h3 class="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Biometric Trends</h3>
            <div class="h-px flex-grow ml-4 bg-slate-100"></div>
          </div>
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            ${renderTable("Heart Rate History", "💓", categorized.heart_rate, "text-rose-600", "bpm")}
            ${renderTable("Sleep Intervals", "🌙", categorized.sleep, "text-indigo-600", "hrs")}
            ${renderTable("Psychological State", "🧠", categorized.mood, "text-emerald-600", "", { 5: "Optimistic", 4: "Stable", 3: "Neutral", 1: "Distressed" })}
            ${renderTable("Pain Assessment", "🛡️", categorized.pain, "text-amber-600", "/ 5")}
          </div>
        </section>

        <section class="grid grid-cols-1 md:grid-cols-2 gap-12 pt-10 border-t border-slate-100">
          <div class="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden group">
            <div class="absolute top-0 right-0 w-32 h-32 bg-white/5 -mr-16 -mt-16 rounded-full group-hover:scale-110 transition-transform"></div>
            <h4 class="text-[10px] font-black text-teal-400 uppercase tracking-[0.3em] mb-4">Chronic Pathologies</h4>
            <div class="flex flex-wrap gap-2">
              ${medical.conditions.length > 0 ? medical.conditions.map((c) => `<span class="bg-white/10 px-3 py-1 rounded-lg text-xs font-bold">${c}</span>`).join("") : '<span class="text-slate-500 text-xs italic">No chronic conditions listed.</span>'}
            </div>
          </div>
          
          <div class="p-4">
            <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6 px-2">Emergency Protocols</h4>
            <div class="space-y-4">
              ${medical.emergencyContacts
                .map(
                  (c) => `
                <div class="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                  <div>
                    <p class="text-xs font-black text-slate-900">${c.name.toUpperCase()}</p>
                    <p class="text-[10px] text-slate-400 font-bold uppercase">Primary Contact</p>
                  </div>
                  <a href="tel:${c.phone}" class="h-10 w-10 bg-teal-50 flex items-center justify-center rounded-xl text-teal-600 transition-colors hover:bg-teal-600 hover:text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                    </svg>
                  </a>
                </div>
              `,
                )
                .join("")}
            </div>
          </div>
        </section>
      </div>

      <div class="bg-slate-50 p-10 text-center">
        <div class="inline-block px-6 py-2 bg-white rounded-full border border-slate-200 mb-4 shadow-sm">
          <p class="text-slate-500 text-[9px] font-black uppercase tracking-[0.4em]">
            Verified Digital Health Record • ${new Date().getFullYear()}
          </p>
        </div>
        <p class="text-slate-300 text-[8px] max-w-md mx-auto leading-relaxed">
          This document contains highly sensitive medical data generated via SwasthyaTwin. Unauthorized reproduction or dissemination is strictly prohibited under digital health privacy regulations.
        </p>
      </div>
    </div>
  </body>
  </html>`;
};
