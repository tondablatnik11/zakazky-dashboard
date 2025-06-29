"use client";

import React, { useState } from "react";
import * as XLSX from "xlsx";
import { format, isBefore, startOfDay } from "date-fns";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { FileDown, UploadCloud, BarChart3, Package, TimerReset } from "lucide-react";

// náhrada za Card komponenty:
const Card = ({ children }) => <div className="p-4 border rounded-md mb-4 bg-gray-700">{children}</div>;
const CardContent = ({ children }) => <div>{children}</div>;



export default function ZakazkyDashboard() {
  const [lang, setLang] = useState("cz");
  const [darkMode, setDarkMode] = useState(true);

  const t = {
    cz: {
      title: "Přehled zakázek",
      upload: "Nahrát soubor",
      export: "Export do PDF",
      total: "Zakázek",
      done: "Hotovo",
      remaining: "Zbývá",
      pallets: "Palety",
      carton: "Karton",
      delayed: "Zpožděné zakázky",
      statuses: "Statusy celkem",
      types: "Typy dodávek",
      switchLang: "EN",
      switchTheme: "Světlý režim"
    },
    en: {
      title: "Order Overview",
      upload: "Upload file",
      export: "Export to PDF",
      total: "Orders",
      done: "Completed",
      remaining: "Remaining",
      pallets: "Pallets",
      carton: "Carton",
      delayed: "Delayed Orders",
      statuses: "Statuses total",
      types: "Delivery Types",
      switchLang: "CZ",
      switchTheme: "Dark Mode"
    }
  };
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState(null);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const workbook = XLSX.read(bstr, { type: "binary" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const processed = processData(jsonData);
      setData(jsonData);
      setSummary(processed);
    };

    reader.readAsBinaryString(file);
  };

  const exportPDF = () => {
    const input = document.getElementById("report-section");
    html2canvas(input).then((canvas) => {
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF();
      pdf.addImage(imgData, "PNG", 10, 10, 190, 0);
      pdf.save("report.pdf");
    });
  };

  const processData = (rows) => {
    const today = startOfDay(new Date());
    const dayOffsets = [0, 1, 2, 3];
    const result = {
      totalToday: 0,
      statusCounts: {},
      byDay: {},
      deliveryTypes: {},
      delayed: 0,
    };

    for (let offset of dayOffsets) {
      const day = format(new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset), "yyyy-MM-dd");
      result.byDay[day] = { total: 0, done: 0, pallets: 0, cartons: 0 };
    }

    rows.forEach((row) => {
      const loadingDate = row["Loading Date"];
      const status = row["Status"];
      const delType = row["del.type"];

      if (!loadingDate) return;

      let parsedDate;
      if (typeof loadingDate === "number") {
        const parsed = XLSX.SSF.parse_date_code(loadingDate);
        parsedDate = new Date(parsed.y, parsed.m - 1, parsed.d);
      } else {
        parsedDate = new Date(loadingDate);
      }

      const formatted = format(parsedDate, "yyyy-MM-dd");

      if (result.byDay[formatted]) {
        result.byDay[formatted].total += 1;
        if (status === 50) result.byDay[formatted].done += 1;
        if (delType === "P") result.byDay[formatted].pallets += 1;
        if (delType === "K") result.byDay[formatted].cartons += 1;
      }

      if (isBefore(parsedDate, today)) {
        result.delayed += 1;
      }

      if (status !== undefined) {
        result.statusCounts[status] = (result.statusCounts[status] || 0) + 1;
      }

      if (delType) {
        result.deliveryTypes[delType] = (result.deliveryTypes[delType] || 0) + 1;
      }
    });

    result.totalToday = result.byDay[format(today, "yyyy-MM-dd")].total;
    return result;
  };

  return (
    <div className={`p-8 space-y-8 min-h-screen ${darkMode ? 'bg-gray-950 text-gray-100' : 'bg-white text-gray-900'}`}>
      <div className="flex justify-between items-center">
  <h1 className="text-4xl font-bold flex items-center gap-2">
    <Package className="w-8 h-8 text-blue-400" /> {t[lang].title}
  </h1>
  <div className="space-x-2">
    <button onClick={() => setLang(lang === 'cz' ? 'en' : 'cz')} className="px-3 py-1 rounded bg-gray-700 text-white">
      {t[lang].switchLang}
    </button>
    <button onClick={() => setDarkMode(!darkMode)} className="px-3 py-1 rounded bg-gray-700 text-white">
      {t[lang].switchTheme}
    </button>
  </div>
</div>

      <div className="flex flex-col md:flex-row justify-center items-center gap-4">
        <label className="cursor-pointer inline-flex items-center gap-2 bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg shadow">
          <UploadCloud className="w-5 h-5 text-white" />
          <span>Nahrát soubor</span>
          <input
            type="file"
            accept=".xlsx, .xls"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
        <button
          onClick={exportPDF}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700"
        >
          <FileDown className="w-5 h-5" /> Export do PDF
        </button>
      </div>

      {summary && (
        <div id="report-section">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {Object.entries(summary.byDay).map(([date, stats]) => (
              <Card key={date} className="bg-gray-800 shadow-md rounded-2xl">
                <CardContent className="p-6 space-y-2">
                  <h2 className="text-lg font-semibold text-blue-400">{date}</h2>
                  <p className="text-gray-200">Zakázek: <strong>{stats.total}</strong></p>
                  <p className="text-green-400">Hotovo: <strong>{stats.done}</strong></p>
<p className="text-red-400">Zbývá: <strong>{stats.total - stats.done}</strong></p>
                  <p className="text-black-200">Palety: <strong>{stats.pallets}</strong></p>
<p className="text-gray-200">Karton: <strong>{stats.cartons}</strong></p>
                  
                </CardContent>
              </Card>
            ))}

            <Card className="bg-gray-800 shadow-md rounded-2xl">
              <CardContent className="p-6 space-y-2">
                <h2 className="text-lg font-semibold text-green-400 flex items-center gap-1">
                  <BarChart3 className="w-4 h-4" /> Statusy celkem
                </h2>
                {Object.entries(summary.statusCounts).map(([status, count]) => (
                  <p key={status} className="text-gray-200">Status {status}: <strong>{count}</strong></p>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-gray-800 shadow-md rounded-2xl">
              <CardContent className="p-6 space-y-2">
                <h2 className="text-lg font-semibold text-indigo-400 flex items-center gap-1">
                  <TimerReset className="w-4 h-4" /> Typy dodávek
                </h2>
                {Object.entries(summary.deliveryTypes).map(([type, count]) => (
                  <p key={type} className="text-gray-200">{type === "P" ? "Palety" : "Kartony"}: <strong>{count}</strong></p>
                ))}
                <p className="text-red-400 pt-2">Zpožděné zakázky: <strong>{summary.delayed}</strong></p>
              </CardContent>
            </Card>
          </div>

          <div className="mt-10 space-y-10">
            <div>
              <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-blue-400" /> Zakázky v čase
              </h2>
              <div className="bg-gradient-to-r from-gray-800 to-gray-700 p-6 rounded-xl shadow-md">
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart
                    data={Object.entries(summary.byDay).map(([date, stats]) => ({
                      date,
                      celkem: stats.total,
                      hotovo: stats.done,
                    }))}
                    margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                  >
                    <XAxis dataKey="date" stroke="#E5E7EB" />
                    <YAxis allowDecimals={false} stroke="#E5E7EB" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="celkem" fill="#EF4444" radius={[6, 6, 0, 0]} animationDuration={800} />
                    <Bar dataKey="hotovo" fill="#10B981" radius={[6, 6, 0, 0]} animationDuration={800} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-blue-400" /> Rozložení statusů
              </h2>
              <div className="bg-gradient-to-r from-gray-800 to-gray-700 p-6 rounded-xl shadow-md">
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart
                    data={Object.entries(summary.statusCounts).map(([status, count]) => ({
                      status,
                      count,
                    }))}
                  >
                    <XAxis dataKey="status" stroke="#E5E7EB" />
                    <YAxis allowDecimals={false} stroke="#E5E7EB" />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3B82F6" radius={[6, 6, 0, 0]} animationDuration={800} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-blue-400" /> Typy zakázek
              </h2>
              <div className="bg-gradient-to-r from-gray-800 to-gray-700 p-6 rounded-xl shadow-md">
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart
                    data={Object.entries(summary.deliveryTypes).map(([type, count]) => ({
                      type: type === "P" ? "Palety" : "Kartony",
                      count,
                    }))}
                  >
                    <XAxis dataKey="type" stroke="#E5E7EB" />
                    <YAxis allowDecimals={false} stroke="#E5E7EB" />
                    <Tooltip />
                    <Bar dataKey="count" fill="#6366F1" radius={[6, 6, 0, 0]} animationDuration={800} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
