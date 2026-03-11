"use client";
import dynamic from "next/dynamic";

// Load the Map component only in the browser
const MapWithNoSSR = dynamic(() => import("../components/Map/Map"), {
  ssr: false,
  loading: () => (
    <div className="h-screen w-full flex items-center justify-center bg-gray-100">
      <p className="text-lg font-semibold text-blue-600 animate-pulse">
        Loading Google Hybrid Map...
      </p>
    </div>
  ),
});

export default function Home() {
  return (
    <main className="h-screen w-full overflow-hidden">
      <MapWithNoSSR />
    </main>
  );
}