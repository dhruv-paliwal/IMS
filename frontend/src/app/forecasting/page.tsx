"use client";

import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import api from "@/utils/api";
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { LineChart, Sparkles, Flame, Calendar, TrendingUp } from "lucide-react";

export default function Forecasting() {
  const [products, setProducts] = useState<any[]>([]);
  const [productId, setProductId] = useState("2"); // Default to Basmati Rice
  const [forecastData, setForecastData] = useState([]);
  const [forecastMeta, setForecastMeta] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get('/products')
      .then(res => {
        setProducts(res.data);
        if (res.data.length > 0 && !productId) {
          setProductId(res.data[0].id.toString());
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (productId) {
      handlePredict();
    }
  }, [productId]);

  const handlePredict = async () => {
    if (!productId) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.post('/ml/forecast', { product_id: parseInt(productId), days_to_predict: 30 });
      setForecastMeta(res.data);
      
      const chartData = res.data.forecast.map((val: number, i: number) => {
          const d = new Date();
          d.setDate(d.getDate() + i);
          return {
              day: d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
              demand: val
          };
      });
      setForecastData(chartData);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to fetch forecast");
    } finally {
      setLoading(false);
    }
  };

  const selectedProduct = products.find(p => p.id === parseInt(productId));

  return (
    <AppLayout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
             <LineChart className="text-terracotta" size={32} />
             Demand Forecasting & Festival Surges
          </h1>
          <p className="text-indigo/70">AI projections enhanced with 30-day historical data and the Indian Festive Calendar.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <div className="glass-card p-6 h-fit space-y-5">
            <h3 className="text-xl font-bold text-indigo">Select Product</h3>
            <div className="space-y-4">
               <div>
                  <label className="block text-sm font-medium mb-1 text-indigo/80">Choose from Catalog</label>
                  <select 
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-indigo/20 bg-white focus:outline-none focus:border-terracotta font-medium"
                  >
                    {products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.category})
                      </option>
                    ))}
                  </select>
               </div>

               <div>
                  <label className="block text-xs font-semibold text-indigo/60 uppercase mb-2">Quick Pick Festive Staples</label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: 2, label: "Basmati Rice" },
                      { id: 11, label: "Desi Ghee" },
                      { id: 19, label: "Cashew Nuts" },
                      { id: 1, label: "Turmeric" },
                      { id: 7, label: "Toor Dal" }
                    ].map(item => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setProductId(item.id.toString())}
                        className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                          productId === item.id.toString() 
                            ? 'bg-terracotta text-white font-bold' 
                            : 'bg-saffron/10 text-indigo hover:bg-saffron/20'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
               </div>

               <button 
                 onClick={handlePredict}
                 disabled={loading}
                 className="w-full bg-terracotta text-white py-2.5 rounded-lg font-bold hover:bg-saffron transition-all disabled:opacity-50 shadow-sm"
               >
                  {loading ? "Calculating Forecast..." : "Recalculate Forecast"}
               </button>
               {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            </div>

            {/* Product Quick Stats */}
            {selectedProduct && (
              <div className="pt-4 border-t border-indigo/10 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-indigo/60">Category:</span>
                  <span className="font-semibold">{selectedProduct.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-indigo/60">Current Stock:</span>
                  <span className="font-semibold">{selectedProduct.stock} units</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-indigo/60">Current Price:</span>
                  <span className="font-bold text-terracotta">₹{selectedProduct.price}</span>
                </div>
              </div>
            )}
         </div>
         
         <div className="glass-card p-6 lg:col-span-2 min-h-[400px]">
            <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
               <div>
                 <h3 className="text-2xl font-bold text-terracotta flex items-center gap-2">
                    <Sparkles className="text-saffron" size={24} />
                    30-Day Demand Projection: {selectedProduct?.name || "Product"}
                 </h3>
                 <p className="text-xs text-indigo/60 mt-0.5">Anchored in historical momentum + Indian festive seasonality.</p>
               </div>
            </div>

            {/* Indian Festival Surge Alert Banner */}
            {forecastMeta?.festivals_detected?.length > 0 && (
              <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-saffron/20 via-turmeric/20 to-terracotta/10 border border-saffron/40 flex items-start gap-3 shadow-sm">
                 <div className="p-2 bg-saffron text-white rounded-lg mt-0.5">
                   <Flame size={20} />
                 </div>
                 <div className="flex-1">
                   <div className="flex flex-wrap items-center gap-2">
                     <span className="font-bold text-indigo text-base">
                       🪔 {forecastMeta.festivals_detected[0].name}
                     </span>
                     <span className="bg-terracotta text-white text-xs font-bold px-2 py-0.5 rounded-full">
                       +{forecastMeta.festivals_detected[0].surge_percent}% Festive Demand Surge
                     </span>
                     <span className="text-xs text-indigo/70 font-semibold flex items-center gap-1">
                       <Calendar size={13} /> {forecastMeta.festivals_detected[0].date} ({forecastMeta.festivals_detected[0].days_away} days away)
                     </span>
                   </div>
                   <p className="text-xs text-indigo/80 mt-1">
                     {forecastMeta.festivals_detected[0].description}
                   </p>
                 </div>
              </div>
            )}

            {/* Metric Highlights */}
            {forecastMeta && (
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-white/60 p-3 rounded-lg border border-indigo/10">
                  <p className="text-xs text-indigo/60 uppercase font-semibold">Base Daily Demand</p>
                  <p className="text-xl font-bold text-indigo mt-0.5">{forecastMeta.baseline_demand} <span className="text-xs font-normal text-indigo/60">units/day</span></p>
                </div>
                <div className="bg-white/60 p-3 rounded-lg border border-saffron/30">
                  <p className="text-xs text-saffron-800 uppercase font-semibold">Festive Peak Demand</p>
                  <p className="text-xl font-bold text-terracotta mt-0.5">{forecastMeta.peak_demand} <span className="text-xs font-normal text-indigo/60">units/day</span></p>
                </div>
                <div className="bg-white/60 p-3 rounded-lg border border-indigo/10">
                  <p className="text-xs text-indigo/60 uppercase font-semibold">Peak Day</p>
                  <p className="text-xl font-bold text-indigo mt-0.5">{forecastMeta.peak_day || "N/A"}</p>
                </div>
              </div>
            )}

            {forecastData.length > 0 ? (
               <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                     <RechartsLineChart data={forecastData} margin={{ top: 5, right: 20, bottom: 25, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" vertical={false} />
                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#666', fontSize: 12}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#666', fontSize: 14, fontWeight: 'bold'}} />
                        <Tooltip 
                           contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                           formatter={(val: number) => [`${val} units/day`, 'Predicted Demand']}
                        />
                        <Line type="monotone" dataKey="demand" stroke="#C04000" strokeWidth={4} dot={false} activeDot={{ r: 8, fill: '#FF9933' }} />
                     </RechartsLineChart>
                  </ResponsiveContainer>
               </div>
            ) : (
               <div className="h-full flex flex-col justify-center items-center text-indigo/40 pb-20">
                  <LineChart size={64} className="mb-4 opacity-50" />
                  <p>Select a product to view its demand forecast</p>
               </div>
            )}
         </div>
      </div>
    </AppLayout>
  );
}
