// "use client";
// import { useState, useEffect, useCallback } from "react";
// import { MapContainer, TileLayer, Marker, Popup, Polygon, useMap, LayersControl } from "react-leaflet";
// import "leaflet/dist/leaflet.css";
// import L from "leaflet";
// import "@geoman-io/leaflet-geoman-free";
// import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";
// import { supabase } from "../../lib/supabaseClient";

// // Custom Marker Icon
// const icon = L.icon({
//   iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
//   shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
//   iconSize: [25, 41],
//   iconAnchor: [12, 41],
// });

// // Helper component for drawing tools
// function MapTools({ onCreated }: { onCreated: (data: any) => void }) {
//   const map = useMap();
//   useEffect(() => {
//     if (!map) return;
//     map.pm.addControls({ position: "topleft", drawPolygon: true, removalMode: true });
//     map.on("pm:create", (e: any) => {
//       const layer = e.layer;
//       if (layer instanceof L.Polygon) {
//         let latlngs = layer.getLatLngs();
//         if (Array.isArray(latlngs[0])) latlngs = latlngs[0];
//         let area = 0;
//         const r = 6378137;
//         const coords = latlngs as L.LatLng[];
//         for (let i = 0; i < coords.length; i++) {
//           const p1 = coords[i];
//           const p2 = coords[(i + 1) % coords.length];
//           area += (p2.lng - p1.lng) * (2 + Math.sin(p1.lat * Math.PI / 180) + Math.sin(p2.lat * Math.PI / 180));
//         }
//         area = Math.abs(area * r * r / 2);
//         const sqft = (area * 10.7639).toFixed(0);
//         const center = layer.getBounds().getCenter();
//         onCreated({ sqft, layer, lat: center.lat.toFixed(6), lng: center.lng.toFixed(6) });
//       }
//     });
//     return () => { map.off("pm:create"); };
//   }, [map, onCreated]);
//   return null;
// }

// // Helper component to handle map flying/centering
// function ChangeView({ center }: { center: [number, number] }) {
//   const map = useMap();
//   useEffect(() => { map.setView(center, 18); }, [center, map]);
//   return null;
// }

// export default function Map() {
//   // UI & Navigation States
//   const [position, setPosition] = useState<[number, number]>([16.8661, 96.1951]);
//   const [searchQuery, setSearchQuery] = useState("");
//   const [step, setStep] = useState(0); 
//   const [showSuccess, setShowSuccess] = useState(false);
//   const [isSidebarOpen, setIsSidebarOpen] = useState(true);

//   // Property & Form States
//   const [savedProperties, setSavedProperties] = useState<any[]>([]);
//   const [currentListing, setCurrentListing] = useState<any>(null);
//   const [propertyId, setPropertyId] = useState("");
//   const [transactionType, setTransactionType] = useState("");
//   const [price, setPrice] = useState("");
//   const [description, setDescription] = useState("");

//   // People & Terms States
//   const [seller, setSeller] = useState({ name: "", nrc: "", ph: "", address: "" });
//   const [buyers, setBuyers] = useState([{ name: "", nrc: "", ph: "", address: "", share: 100 }]);
//   const [paymentType, setPaymentType] = useState("FULL");
//   const [installments, setInstallments] = useState([{ date: "", amount: "" }]);

//   const totalShare = buyers.reduce((sum, b) => sum + (Number(b.share) || 0), 0);
//   const isFormValid = totalShare === 100 && seller.name && seller.ph;

//   // FETCH DATA FROM SUPABASE
//   const fetchProperties = useCallback(async () => {
//     if (!supabase) return;
//     const { data, error } = await supabase.from('properties').select('*');
//     if (error) console.error('Fetch error:', error.message);
//     else setSavedProperties(data || []);
//   }, []);

//   useEffect(() => { fetchProperties(); }, [fetchProperties]);

//   // DELETE LOGIC
//   const handleDelete = async (idToDelete: string) => {
//     if (!window.confirm(`Are you sure you want to delete listing ${idToDelete}?`)) return;
  
//     // 1. Delete Shareholders
//     const { error: shareError } = await supabase
//       .from('shareholders')
//       .delete()
//       .eq('property_ref', idToDelete);
  
//     if (shareError) {
//       console.error("Shareholder Delete Error:", shareError.message);
//       alert("Delete failed: " + shareError.message);
//       return;
//     }
  
//     // 2. Delete the main Property
//     const { error: propError } = await supabase
//       .from('properties')
//       .delete()
//       .eq('property_id', idToDelete);
  
//     if (propError) {
//       // If this alert shows, the data will NOT be removed from the UI
//       alert("Database Error: " + propError.message);
//       console.error("Check your Supabase RLS policies for column errors.");
//     } else {
//       // 3. ONLY update UI if database confirm success
//       setSavedProperties((prev) => prev.filter((p) => p.property_id !== idToDelete));
//     }
//   };
//   // SAVE/UPSERT LOGIC
//   const handleFinish = async () => {
//     if (!propertyId) return;
//     const { error: propError } = await supabase.from('properties').upsert([{
//       property_id: propertyId,
//       price: parseFloat(price),
//       description: description,
//       area_sqft: currentListing?.sqft || undefined,
//       gps_lat: currentListing?.lat || position[0].toString(),
//       gps_lng: currentListing?.lng || position[1].toString(),
//       transaction_type: transactionType,
//       seller_name: seller.name,
//       seller_nrc: seller.nrc,
//       seller_phone: seller.ph,
//       seller_address: seller.address
//     }], { onConflict: 'property_id' });

//     if (propError) return alert(propError.message);

//     await supabase.from('shareholders').delete().eq('property_ref', propertyId);
//     const shareholdersToSave = buyers.map(b => ({
//       property_ref: propertyId, name: b.name, nrc: b.nrc, phone: b.ph, address: b.address, share_percent: b.share
//     }));
//     await supabase.from('shareholders').insert(shareholdersToSave);

//     setShowSuccess(true);
//     fetchProperties();
//     setTimeout(() => { setStep(0); setShowSuccess(false); }, 2000);
//   };

//   const handlePropertyCreated = useCallback((data: any) => {
//     setCurrentListing(data);
//     setStep(1);
//   }, []);

//   const handleSearch = async () => {
//     if (!searchQuery) return;
//     try {
//       const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery + " Myanmar")}&limit=1`);
//       const data = await res.json();
//       if (data.length > 0) setPosition([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
//     } catch (e) { console.error(e); }
//   };

//   return (
//     <div className="relative h-screen w-full font-sans text-black overflow-hidden">
      
//       {/* SIDEBAR */}
//       <div className={`absolute top-0 left-0 z-[1100] h-full bg-white shadow-2xl transition-all duration-300 flex ${isSidebarOpen ? 'w-80' : 'w-0'}`}>
//         <div className="flex-1 flex flex-col h-full border-r overflow-hidden">
//           <div className="p-5 bg-blue-900 text-white flex justify-between items-center shrink-0">
//             <div>
//               <h2 className="font-black text-lg tracking-tighter">SAVED LISTINGS</h2>
//               <p className="text-[10px] text-blue-300 uppercase font-bold">Total: {savedProperties.length}</p>
//             </div>
//             <button onClick={fetchProperties} className="p-2 hover:bg-blue-800 rounded-lg">🔄</button>
//           </div>
//           <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
//             {savedProperties.map((prop) => (
//               <div key={prop.id} className="relative group">
//                 <button 
//                   onClick={(e) => { e.stopPropagation(); handleDelete(prop.property_id); }}
//                   className="absolute top-3 right-3 z-10 p-2 text-red-400 opacity-0 group-hover:opacity-100 transition-all hover:text-red-600"
//                 >🗑️</button>
//                 <button
//                   onClick={() => setPosition([parseFloat(prop.gps_lat), parseFloat(prop.gps_lng)])}
//                   className="w-full text-left bg-white p-4 rounded-2xl border border-gray-100 hover:border-blue-500 hover:shadow-xl transition-all"
//                 >
//                   <div className="flex justify-between items-start mb-2 pr-6">
//                     <span className="text-xs font-black text-blue-900">{prop.property_id}</span>
//                     <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">{prop.price} L</span>
//                   </div>
//                   <p className="text-[10px] text-gray-500 line-clamp-2 mb-3">{prop.description}</p>
//                   <div className="flex justify-between items-center border-t pt-3">
//                     <span className="text-[9px] font-black px-2 py-0.5 rounded bg-blue-50 text-blue-600 uppercase">{prop.transaction_type}</span>
//                     <span className="text-[9px] font-bold text-blue-600 group-hover:translate-x-1 transition-transform">VIEW ON MAP →</span>
//                   </div>
//                 </button>
//               </div>
//             ))}
//           </div>
//         </div>
//         <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="absolute top-1/2 -right-8 h-20 w-8 bg-white flex items-center justify-center rounded-r-xl shadow-lg border-y border-r hover:text-blue-600">
//           <span className="font-bold">{isSidebarOpen ? "‹" : "›"}</span>
//         </button>
//       </div>

//       {/* SEARCH BAR */}
//       <div className="absolute top-4 left-14 z-[1001] flex gap-2 bg-white p-2 rounded-lg shadow-2xl transition-all ml-72">
//         <input 
//           className="p-2 border rounded text-black w-64 outline-none focus:ring-2 focus:ring-blue-500"
//           placeholder="Search location..."
//           value={searchQuery}
//           onChange={(e) => setSearchQuery(e.target.value)}
//           onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
//         />
//         <button onClick={handleSearch} className="bg-blue-600 text-white px-4 py-2 rounded font-bold hover:bg-blue-700">Search</button>
//       </div>

//       {showSuccess && (
//         <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[5000] bg-green-600 text-white px-8 py-4 rounded-full shadow-2xl border-2 border-white font-bold">
//           ✅ Record Updated Successfully!
//         </div>
//       )}

//       {/* STEP 2: SUMMARY */}
//       {step === 2 && (
//         <div className="absolute inset-0 z-[2001] flex items-center justify-center bg-black/70">
//           <div className="bg-white p-8 rounded-2xl shadow-2xl w-[500px]">
//             <h2 className="text-xl font-black mb-4 text-center">SUBMISSION SUMMARY</h2>
//             <div className="bg-gray-100 p-4 rounded-lg space-y-2 mb-6 text-sm">
//               <p className="flex justify-between"><span>ID:</span> <b>{propertyId}</b></p>
//               <p className="flex justify-between"><span>GPS:</span> <b>{currentListing?.lat || position[0]}, {currentListing?.lng || position[1]}</b></p>
//               <p className="flex justify-between"><span>AREA:</span> <b>{currentListing?.sqft || "0"} Sq-Ft</b></p>
//             </div>
//             <div className="flex gap-4">
//               <button onClick={() => setStep(0)} className="flex-1 bg-gray-200 py-3 rounded-xl font-bold">Cancel</button>
//               <button onClick={() => setStep(3)} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold">Next</button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* STEP 3: FORM */}
//       {step === 3 && (
//         <div className="absolute inset-0 z-[2002] flex items-center justify-center bg-black/80 p-4">
//           <div className="bg-white p-8 rounded-2xl shadow-2xl w-[950px] max-h-[90vh] overflow-y-auto">
//             <h2 className="text-2xl font-bold mb-6 border-b pb-2 text-blue-900">Buyer & Seller Detailed Info</h2>
//             <div className="grid grid-cols-2 gap-10">
//               <div className="space-y-3">
//                 <h3 className="font-bold text-green-700 underline uppercase text-sm">Seller Information</h3>
//                 <input className="w-full border p-2 rounded text-sm" placeholder="Full Name" value={seller.name} onChange={(e)=>setSeller({...seller, name: e.target.value})} />
//                 <input className="w-full border p-2 rounded text-sm" placeholder="NRC Number" value={seller.nrc} onChange={(e)=>setSeller({...seller, nrc: e.target.value})} />
//                 <input className="w-full border p-2 rounded text-sm" placeholder="Phone Number" value={seller.ph} onChange={(e)=>setSeller({...seller, ph: e.target.value})} />
//                 <textarea className="w-full border p-2 rounded h-20 text-sm" placeholder="Full Address" value={seller.address} onChange={(e)=>setSeller({...seller, address: e.target.value})} />
//               </div>
//               <div className="space-y-4">
//                 <div className="flex justify-between items-center"><h3 className="font-bold text-blue-700 uppercase text-sm">Buyers</h3><button onClick={()=>setBuyers([...buyers, {name:"", nrc:"", ph:"", address:"", share: 0}])} className="text-[10px] bg-blue-600 text-white px-2 py-1 rounded">+ ADD</button></div>
//                 {buyers.map((b, i) => (
//                   <div key={i} className="p-4 bg-blue-50 border rounded-lg">
//                     <input className="border p-2 rounded text-xs w-full mb-2" placeholder="Full Name" value={b.name} onChange={(e)=>{let nb=[...buyers]; nb[i].name=e.target.value; setBuyers(nb);}} />
//                     <input className="border p-2 rounded text-xs w-full" type="number" placeholder="Share %" value={b.share} onChange={(e)=>{let nb=[...buyers]; nb[i].share=Number(e.target.value); setBuyers(nb);}} />
//                   </div>
//                 ))}
//               </div>
//             </div>
//             <div className="mt-8 flex gap-4">
//               <button onClick={() => setStep(0)} className="flex-1 bg-gray-200 py-3 rounded-xl font-bold">CANCEL</button>
//               <button disabled={!isFormValid} onClick={handleFinish} className={`flex-1 py-3 rounded-xl font-bold text-white shadow-lg ${isFormValid ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-300 cursor-not-allowed"}`}>
//                 {savedProperties.some(p => p.property_id === propertyId) ? "UPDATE LISTING" : "FINISH & SAVE"}
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* MAP */}
//       <MapContainer center={position} zoom={15} style={{ height: "100%", width: "100%" }}>
//         <ChangeView center={position} />
//         <MapTools onCreated={handlePropertyCreated} />
//         {savedProperties.map((prop) => (
//           <Marker key={prop.id} position={[parseFloat(prop.gps_lat), parseFloat(prop.gps_lng)]} icon={icon}>
//             <Popup minWidth={250}>
//               <div className="text-black p-2">
//                 <h3 className="font-black text-blue-900 border-b pb-1 mb-2">{prop.property_id}</h3>
//                 <p className="text-xs"><b>Price:</b> {prop.price} L</p>
//                 <p className="text-xs"><b>Area:</b> {prop.area_sqft} Sq-Ft</p>
//                 <p className="text-[10px] text-gray-500 italic mt-2">"{prop.description}"</p>
//                 <button 
//                   onClick={async () => {
//                     setPrice(prop.price); setDescription(prop.description); setPropertyId(prop.property_id);
//                     setTransactionType(prop.transaction_type); setPosition([parseFloat(prop.gps_lat), parseFloat(prop.gps_lng)]);
//                     setSeller({ name: prop.seller_name || "", nrc: prop.seller_nrc || "", ph: prop.seller_phone || "", address: prop.seller_address || "" });
//                     const { data: shareData } = await supabase.from('shareholders').select('*').eq('property_ref', prop.property_id);
//                     if (shareData) setBuyers(shareData.map(s => ({ name: s.name, nrc: s.nrc, ph: s.phone, address: s.address, share: s.share_percent })));
//                     setStep(2); // Go to summary first to avoid null crash
//                   }}
//                   className="w-full bg-blue-600 text-white py-2 rounded-lg text-[10px] font-bold mt-4 hover:bg-blue-700"
//                 >EDIT DETAILS</button>
//               </div>
//             </Popup>
//           </Marker>
//         ))}
//         <LayersControl position="bottomright">
//           <LayersControl.BaseLayer checked name="Satellite View"><TileLayer url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}" /></LayersControl.BaseLayer>
//           <LayersControl.BaseLayer name="Street View"><TileLayer url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}" /></LayersControl.BaseLayer>
//         </LayersControl>
//       </MapContainer>
//     </div>
//   );
// }



"use client";
import { useState, useEffect, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, LayersControl } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "@geoman-io/leaflet-geoman-free";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";
import { supabase } from "../../lib/supabaseClient";

// Custom Marker Icon
const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// Map Drawing Tools Component
function MapTools({ onCreated }: { onCreated: (data: any) => void }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    map.pm.addControls({ position: "topleft", drawPolygon: true, removalMode: true });
    map.on("pm:create", (e: any) => {
      const layer = e.layer;
      if (layer instanceof L.Polygon) {
        let latlngs = layer.getLatLngs();
        if (Array.isArray(latlngs[0])) latlngs = latlngs[0];
        let area = 0;
        const r = 6378137;
        const coords = latlngs as L.LatLng[];
        for (let i = 0; i < coords.length; i++) {
          const p1 = coords[i];
          const p2 = coords[(i + 1) % coords.length];
          area += (p2.lng - p1.lng) * (2 + Math.sin(p1.lat * Math.PI / 180) + Math.sin(p2.lat * Math.PI / 180));
        }
        area = Math.abs(area * r * r / 2);
        const sqft = (area * 10.7639).toFixed(0);
        const center = layer.getBounds().getCenter();
        onCreated({ sqft, layer, lat: center.lat.toFixed(6), lng: center.lng.toFixed(6) });
      }
    });
    return () => { map.off("pm:create"); };
  }, [map, onCreated]);
  return null;
}

// Map View Controller
function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => { map.setView(center, 18); }, [center, map]);
  return null;
}

export default function Map() {
  // Navigation & UI States
  const [position, setPosition] = useState<[number, number]>([16.8661, 96.1951]);
  const [searchQuery, setSearchQuery] = useState("");
  const [step, setStep] = useState(0); 
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Property States
  const [savedProperties, setSavedProperties] = useState<any[]>([]);
  const [currentListing, setCurrentListing] = useState<any>(null);
  const [propertyId, setPropertyId] = useState("");
  const [transactionType, setTransactionType] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");

  // People & Payment States
  const [seller, setSeller] = useState({ name: "", nrc: "", ph: "", address: "" });
  const [buyers, setBuyers] = useState([{ name: "", nrc: "", ph: "", address: "", share: 100 }]);
  const [paymentType, setPaymentType] = useState("CASH_DOWN"); // Options: CASH_DOWN, INSTALLMENT
  const [installments, setInstallments] = useState([{ date: "", amount: "" }]);

 // Calculate total shares
const totalShare = buyers.reduce((sum, b) => sum + (Number(b.share) || 0), 0);

// Calculate total installment amounts
const totalInstallments = installments.reduce((sum, inst) => sum + (Number(inst.amount) || 0), 0);
const remainingBalance = Number(price) - totalInstallments;
// Check if the form is valid based on your new rules
const isFormValid = 
  totalShare === 100 && 
  (paymentType === "CASH_DOWN" || remainingBalance === 0) &&
  seller.name && 
  seller.ph;
  // --- DATABASE FUNCTIONS ---
  
  const fetchProperties = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from('properties').select('*');
    if (error) console.error('Fetch error:', error.message);
    else setSavedProperties(data || []);
  }, []);

  useEffect(() => { fetchProperties(); }, [fetchProperties]);

  const handleDelete = async (idToDelete: string) => {
    if (!window.confirm(`Delete listing ${idToDelete}?`)) return;
    await supabase.from('shareholders').delete().eq('property_ref', idToDelete);
    const { error } = await supabase.from('properties').delete().eq('property_id', idToDelete);
    if (error) alert(error.message);
    else fetchProperties();
  };

  const handleFinish = async () => {
    if (!propertyId) return;
    // UPSERT: Handles both new save and updates
    const { error: propError } = await supabase.from('properties').upsert([{
      property_id: propertyId,
      price: parseFloat(price),
      description: description,
      area_sqft: currentListing?.sqft || undefined,
      gps_lat: currentListing?.lat || position[0].toString(),
      gps_lng: currentListing?.lng || position[1].toString(),
      transaction_type: transactionType,
      seller_name: seller.name,
      seller_nrc: seller.nrc,
      seller_phone: seller.ph,
      seller_address: seller.address
    }], { onConflict: 'property_id' });

    if (propError) return alert("Database Error: " + propError.message);

    // Refresh Shareholders
    await supabase.from('shareholders').delete().eq('property_ref', propertyId);
    const shareholdersToSave = buyers.map(b => ({
      property_ref: propertyId, name: b.name, nrc: b.nrc, phone: b.ph, address: b.address, share_percent: b.share
    }));
    await supabase.from('shareholders').insert(shareholdersToSave);

    setShowSuccess(true);
    fetchProperties();
    setTimeout(() => { setStep(0); setShowSuccess(false); }, 2000);
  };

  const handlePropertyCreated = useCallback((data: any) => {
    setCurrentListing(data);
    setStep(1);
  }, []);

  const handleSearch = async () => {
    if (!searchQuery) return;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery + " Myanmar")}&limit=1`);
      const data = await res.json();
      if (data.length > 0) setPosition([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
    } catch (e) { console.error(e); }
  };

  

  return (
    <div className="relative h-screen w-full font-sans text-black overflow-hidden">
      
      {/* SIDEBAR: SAVED LISTINGS */}
      <div className={`absolute top-0 left-0 z-[1100] h-full bg-white shadow-2xl transition-all duration-300 flex ${isSidebarOpen ? 'w-80' : 'w-0'}`}>
        <div className="flex-1 flex flex-col h-full border-r overflow-hidden">
          <div className="p-5 bg-blue-900 text-white flex justify-between items-center shrink-0">
            <div>
              <h2 className="font-black text-lg tracking-tighter">SAVED LISTINGS</h2>
              <p className="text-[10px] text-blue-300 uppercase font-bold">Total: {savedProperties.length}</p>
            </div>
            <button onClick={fetchProperties} className="p-2 hover:bg-blue-800 rounded-lg">🔄</button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {savedProperties.map((prop) => (
              <div key={prop.id} className="relative group">
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDelete(prop.property_id); }}
                  className="absolute top-3 right-3 z-10 p-2 text-red-400 opacity-0 group-hover:opacity-100 transition-all hover:text-red-600"
                >🗑️</button>
                <button
                  onClick={() => setPosition([parseFloat(prop.gps_lat), parseFloat(prop.gps_lng)])}
                  className="w-full text-left bg-white p-4 rounded-2xl border border-gray-100 hover:border-blue-500 hover:shadow-xl transition-all"
                >
                  <div className="flex justify-between items-start mb-2 pr-6">
                    <span className="text-xs font-black text-blue-900">{prop.property_id}</span>
                    <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">{prop.price} L</span>
                  </div>
                  <p className="text-[10px] text-gray-500 line-clamp-2 mb-3">{prop.description}</p>
                  <div className="flex justify-between items-center border-t pt-3">
                    <span className="text-[9px] font-black px-2 py-0.5 rounded bg-blue-50 text-blue-600 uppercase">{prop.transaction_type}</span>
                    <span className="text-[9px] font-bold text-blue-600 group-hover:translate-x-1 transition-transform">VIEW ON MAP →</span>
                  </div>
                </button>
              </div>
            ))}
          </div>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="absolute top-1/2 -right-8 h-20 w-8 bg-white flex items-center justify-center rounded-r-xl shadow-lg border-y border-r hover:text-blue-600 transition-colors">
          <span className="font-bold text-lg">{isSidebarOpen ? "‹" : "›"}</span>
        </button>
      </div>

      {/* SEARCH BAR */}
      <div className={`absolute top-4 z-[1001] flex gap-2 bg-white p-2 rounded-lg shadow-2xl transition-all duration-300 ${isSidebarOpen ? 'left-[340px]' : 'left-14'}`}>
        <input 
          className="p-2 border rounded text-black w-64 outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Search location..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button onClick={handleSearch} className="bg-blue-600 text-white px-4 py-2 rounded font-bold hover:bg-blue-700">Search</button>
      </div>

      {showSuccess && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[5000] bg-green-600 text-white px-8 py-4 rounded-full shadow-2xl border-2 border-white font-bold animate-bounce">
          ✅ Record Saved & Updated Successfully!
        </div>
      )}

      {/* STEP 1: INITIAL ENTRY */}
      {step === 1 && (
        <div className="absolute inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-xl shadow-2xl w-[400px]">
            <h2 className="text-2xl font-bold mb-4 text-blue-800 text-center uppercase tracking-tight">Property Entry</h2>
            <input type="number" className="w-full border p-3 mb-4 rounded focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Price (Lakhs)" value={price} onChange={(e)=>setPrice(e.target.value)} />
            <textarea className="w-full border p-3 mb-6 rounded h-24 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Description" value={description} onChange={(e)=>setDescription(e.target.value)} />
            <div className="flex gap-4">
              <button className="flex-1 bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition-colors" onClick={() => { setTransactionType("SELL"); setPropertyId(`RE-${Math.floor(Math.random()*90000)}`); setStep(2); }}>SELL</button>
              <button className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors" onClick={() => { setTransactionType("BUY"); setPropertyId(`RE-${Math.floor(Math.random()*90000)}`); setStep(2); }}>BUY</button>
            </div>
            <button onClick={()=>setStep(0)} className="w-full mt-4 text-gray-400 text-xs hover:underline">Cancel</button>
          </div>
        </div>
      )}

      {/* STEP 2: SUMMARY */}
      {step === 2 && (
        <div className="absolute inset-0 z-[2001] flex items-center justify-center bg-black/70">
          <div className="bg-white p-8 rounded-2xl shadow-2xl w-[500px]">
            <h2 className="text-xl font-black mb-4 text-center">SUBMISSION SUMMARY</h2>
            <div className="bg-gray-100 p-4 rounded-lg space-y-2 mb-6 text-sm">
              <p className="flex justify-between"><span>ID:</span> <b>{propertyId}</b></p>
              <p className="flex justify-between"><span>GPS:</span> <b>{currentListing?.lat || position[0]}, {currentListing?.lng || position[1]}</b></p>
              <p className="flex justify-between"><span>AREA:</span> <b>{currentListing?.sqft || "0"} Sq-Ft</b></p>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setStep(0)} className="flex-1 bg-gray-200 py-3 rounded-xl font-bold text-gray-600">Cancel</button>
              <button onClick={() => setStep(3)} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold">Next</button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: BUYER/SELLER FORM */}
      {/* {step === 3 && (
        <div className="absolute inset-0 z-[2002] flex items-center justify-center bg-black/80 p-4">
          <div className="bg-white p-8 rounded-2xl shadow-2xl w-[950px] max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6 border-b pb-2 text-blue-900">Buyer & Seller Detailed Info</h2>
            <div className="grid grid-cols-2 gap-10">
              <div className="space-y-3">
                <h3 className="font-bold text-green-700 underline uppercase text-sm">Seller Information</h3>
                <input className="w-full border p-2 rounded text-sm" placeholder="Full Name" value={seller.name} onChange={(e)=>setSeller({...seller, name: e.target.value})} />
                <input className="w-full border p-2 rounded text-sm" placeholder="NRC Number" value={seller.nrc} onChange={(e)=>setSeller({...seller, nrc: e.target.value})} />
                <input className="w-full border p-2 rounded text-sm" placeholder="Phone Number" value={seller.ph} onChange={(e)=>setSeller({...seller, ph: e.target.value})} />
                <textarea className="w-full border p-2 rounded h-20 text-sm" placeholder="Full Address" value={seller.address} onChange={(e)=>setSeller({...seller, address: e.target.value})} />
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="font-bold text-blue-700 uppercase text-sm">Buyers</h3>
                    <button onClick={()=>setBuyers([...buyers, {name:"", nrc:"", ph:"", address:"", share: 0}])} className="text-[10px] bg-blue-600 text-white px-2 py-1 rounded shadow-md">+ ADD</button>
                </div>
                {buyers.map((b, i) => (
                  <div key={i} className="p-4 bg-blue-50 border rounded-lg space-y-2">
                    <input className="border p-2 rounded text-xs w-full" placeholder="Full Name" value={b.name} onChange={(e)=>{let nb=[...buyers]; nb[i].name=e.target.value; setBuyers(nb);}} />
                    <div className="flex gap-2">
                        <input className="border p-2 rounded text-xs flex-1" placeholder="NRC" value={b.nrc} onChange={(e)=>{let nb=[...buyers]; nb[i].nrc=e.target.value; setBuyers(nb);}} />
                        <input className="border p-2 rounded text-xs w-20" type="number" placeholder="Share %" value={b.share} onChange={(e)=>{let nb=[...buyers]; nb[i].share=Number(e.target.value); setBuyers(nb);}} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-8 flex gap-4">
              <button onClick={() => setStep(0)} className="flex-1 bg-gray-200 py-3 rounded-xl font-bold text-gray-500">CANCEL</button>
              <button disabled={!isFormValid} onClick={handleFinish} className={`flex-1 py-3 rounded-xl font-bold text-white shadow-lg transition-all ${isFormValid ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-300 cursor-not-allowed"}`}>
                {savedProperties.some(p => p.property_id === propertyId) ? "UPDATE LISTING" : "FINISH & SAVE"}
              </button>
            </div>
          </div>
        </div>
      )} */}
      {step === 3 && (
        <div className="absolute inset-0 z-[2002] flex items-center justify-center bg-black/80 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-2xl w-[1000px] max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6 border-b pb-2 text-blue-900 flex justify-between">
                Buyer & Seller Detailed Info
                <span className="text-sm font-normal text-gray-400 self-end">ID: {propertyId}</span>
            </h2>
            
            <div className="grid grid-cols-2 gap-10">
                {/* SELLER SECTION */}
                <div className="space-y-3">
                <h3 className="font-bold text-green-700 underline uppercase text-sm">Seller Information</h3>
                <input className="w-full border p-2 rounded text-sm" placeholder="Full Name" value={seller.name} onChange={(e)=>setSeller({...seller, name: e.target.value})} />
                <input className="w-full border p-2 rounded text-sm" placeholder="NRC Number" value={seller.nrc} onChange={(e)=>setSeller({...seller, nrc: e.target.value})} />
                <input className="w-full border p-2 rounded text-sm" placeholder="Phone Number" value={seller.ph} onChange={(e)=>setSeller({...seller, ph: e.target.value})} />
                <textarea className="w-full border p-2 rounded h-20 text-sm" placeholder="Full Address" value={seller.address} onChange={(e)=>setSeller({...seller, address: e.target.value})} />
                </div>

                {/* BUYER & PAYMENT SECTION */}
                <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="font-bold text-blue-700 underline uppercase text-sm">Buyer / Shareholders</h3>
                    <button onClick={()=>setBuyers([...buyers, {name:"", nrc:"", ph:"", address:"", share: 0}])} className="text-[10px] bg-blue-600 text-white px-2 py-1 rounded font-bold">+ ADD SHAREHOLDER</button>
                </div>
                
                <div className="max-h-[300px] overflow-y-auto space-y-4 pr-2">
                    {buyers.map((b, i) => (
                    <div key={i} className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                        <div className="grid grid-cols-3 gap-2">
                        <input className="border p-2 rounded text-xs col-span-2" placeholder="Full Name" value={b.name} onChange={(e)=>{let nb=[...buyers]; nb[i].name=e.target.value; setBuyers(nb);}} />
                        <div className="flex items-center gap-1">
                            <input className="border p-2 rounded text-xs w-full" type="number" placeholder="Share %" value={b.share} onChange={(e)=>{let nb=[...buyers]; nb[i].share=Number(e.target.value); setBuyers(nb);}} />
                            <span className="text-[10px] font-bold text-gray-400">%</span>
                        </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                        <input className="border p-2 rounded text-xs" placeholder="NRC Number" value={b.nrc} onChange={(e)=>{let nb=[...buyers]; nb[i].nrc=e.target.value; setBuyers(nb);}} />
                        <input className="border p-2 rounded text-xs" placeholder="Phone Number" value={b.ph} onChange={(e)=>{let nb=[...buyers]; nb[i].ph=e.target.value; setBuyers(nb);}} />
                        </div>
                    </div>
                    ))}
                </div>

                {/* DYNAMIC PAYMENT TERMS */}
                <div className="pt-4 border-t">
                    <h3 className="font-bold text-gray-700 text-[10px] mb-2 uppercase tracking-widest">Payment Terms</h3>
                    <select className="w-full border p-2 rounded mb-2 text-xs bg-white" value={paymentType} onChange={(e)=>setPaymentType(e.target.value)}>
                    <option value="CASH_DOWN">Total Amount (Cash Down)</option>
                    <option value="INSTALLMENT">Installment Schedule</option>
                    </select>

                    <div className="bg-gray-50 p-3 rounded border">
                        <p className={`text-xs font-bold text-center ${totalShare === 100 ? 'text-green-600' : 'text-red-600'}`}>
                            Total Ownership: {totalShare}% 
                            {totalShare !== 100 && ' (Must equal exactly 100%)'}
                        </p>
                    </div>
                    
                    {/* {paymentType === "INSTALLMENT" && (
                        <div className="space-y-2">
                            <div className="pt-2 border-t">
                            <p className={`text-[10px] font-bold ${totalInstallments > Number(price) ? 'text-red-600' : 'text-blue-600'}`}>
                                Total Milestone Amount: {totalInstallments} Lakhs / Limit: {price} Lakhs
                            </p>
                            {totalInstallments > Number(price) && (
                                <p className="text-[9px] text-red-500 animate-pulse">
                                ⚠️ Error: Installments cannot exceed the buying price!
                                </p>
                            )}
                            </div>
                        </div>
                    )} */}

                  {paymentType === "INSTALLMENT" && (
                    <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <h4 className="text-[10px] font-bold text-gray-500 uppercase italic">Payment Schedule</h4>
                      
                      {installments.map((inst, idx) => (
                        <div key={idx} className="flex gap-2 items-center animate-fadeIn">
                          {/* DATE INPUT */}
                          <input 
                            type="date" 
                            className="border p-2 rounded text-[10px] flex-1 outline-none focus:ring-1 focus:ring-blue-400" 
                            value={inst.date}
                            onChange={(e) => {
                              let ni = [...installments];
                              ni[idx].date = e.target.value;
                              setInstallments(ni);
                            }}
                          />
                          {/* AMOUNT INPUT */}
                          <div className="flex-1 relative">
                            <input 
                              type="number" 
                              className="border p-2 rounded text-[10px] w-full pr-8 outline-none focus:ring-1 focus:ring-blue-400" 
                              placeholder="Amount" 
                              value={inst.amount}
                              onChange={(e) => {
                                let ni = [...installments];
                                ni[idx].amount = e.target.value;
                                setInstallments(ni);
                              }}
                            />
                            <span className="absolute right-2 top-2 text-[8px] text-gray-400">L</span>
                          </div>
                        </div>
                      ))}

                      <button 
                        onClick={() => setInstallments([...installments, {date: "", amount: ""}])} 
                        className="text-[10px] text-blue-600 font-bold hover:underline"
                      >
                        + Add Next Milestone
                      </button>

                      {/* BALANCE ALERTS */}
                      <div className="pt-3 border-t mt-2">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] text-gray-500">Remaining to Schedule:</span>
                          <span className={`text-[11px] font-black ${remainingBalance === 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {remainingBalance} Lakhs
                          </span>
                        </div>

                        {remainingBalance > 0 && (
                          <p className="text-[9px] text-orange-600 bg-orange-50 p-2 rounded border border-orange-100 italic">
                            ⚠️ Alert: You still have {remainingBalance} Lakhs left to assign to a payment date.
                          </p>
                        )}

                        {remainingBalance < 0 && (
                          <p className="text-[9px] text-red-600 bg-red-50 p-2 rounded border border-red-100 font-bold">
                            ❌ Error: Total installments exceed the property price by {Math.abs(remainingBalance)} Lakhs!
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                </div>
            </div>

            <div className="mt-8 flex gap-4">
                <button onClick={() => setStep(0)} className="flex-1 bg-gray-200 py-3 rounded-xl font-bold text-gray-600">CANCEL</button>
                <button disabled={!isFormValid} onClick={handleFinish} className={`flex-1 py-3 rounded-xl font-bold text-white shadow-lg ${isFormValid ? "bg-blue-600" : "bg-gray-300 cursor-not-allowed"}`}>
                {savedProperties.some(p => p.property_id === propertyId) ? "UPDATE LISTING" : "FINISH & SAVE"}
                </button>
            </div>
            </div>
        </div>
        )}

      {/* MAP ENGINE */}
      <MapContainer center={position} zoom={15} style={{ height: "100%", width: "100%" }}>
        <ChangeView center={position} />
        <MapTools onCreated={handlePropertyCreated} />
        
        {savedProperties.map((prop) => (
          <Marker key={prop.id} position={[parseFloat(prop.gps_lat), parseFloat(prop.gps_lng)]} icon={icon}>
            <Popup minWidth={280}>
              <div className="text-black p-2 font-sans">
                <h3 className="font-black text-blue-900 border-b pb-1 mb-2 flex justify-between">
                    <span>{prop.property_id}</span>
                    <span className="text-[9px] bg-blue-50 px-2 py-0.5 rounded uppercase">{prop.transaction_type}</span>
                </h3>
                <div className="space-y-1 mb-3">
                    <p className="text-xs"><b>Price:</b> <span className="text-green-600 font-bold">{prop.price} L</span></p>
                    <p className="text-xs"><b>Area:</b> {prop.area_sqft} Sq-Ft</p>
                    <p className="text-[10px] text-gray-500 leading-tight mt-2 italic">"{prop.description}"</p>
                </div>
                <button 
                  onClick={async () => {
                    // Pre-fill states for Edit Mode
                    setPrice(prop.price); 
                    setDescription(prop.description); 
                    setPropertyId(prop.property_id);
                    setTransactionType(prop.transaction_type); 
                    setPosition([parseFloat(prop.gps_lat), parseFloat(prop.gps_lng)]);
                    setSeller({ 
                        name: prop.seller_name || "", 
                        nrc: prop.seller_nrc || "", 
                        ph: prop.seller_phone || "", 
                        address: prop.seller_address || "" 
                    });
                    
                    const { data: shareData } = await supabase.from('shareholders').select('*').eq('property_ref', prop.property_id);
                    if (shareData) setBuyers(shareData.map(s => ({ name: s.name, nrc: s.nrc, ph: s.phone, address: s.address, share: s.share_percent })));
                    
                    setStep(3); // Jump straight to full edit form
                  }}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-blue-700 shadow-sm"
                >EDIT FULL DETAILS</button>
              </div>
            </Popup>
          </Marker>
        ))}

        <LayersControl position="bottomright">
          <LayersControl.BaseLayer checked name="Satellite View">
            <TileLayer url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}" attribution="&copy; Google Maps" />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Street View">
            <TileLayer url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}" attribution="&copy; Google Maps" />
          </LayersControl.BaseLayer>
        </LayersControl>
      </MapContainer>
    </div>
  );
}