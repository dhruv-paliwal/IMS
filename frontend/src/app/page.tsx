"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { formatCurrency } from "@/utils/currency";
import api from "@/utils/api";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { IndianRupee, AlertCircle, TrendingUp, X, ShoppingCart, Tag, Zap } from "lucide-react";

export default function Dashboard() {
  const [kpis, setKpis] = useState({ total_revenue: 0, inventory_valuation: 0, low_stock_alerts: 0 });
  const [salesData, setSalesData] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [clearanceItems, setClearanceItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [trendData, setTrendData] = useState([]);
  
  // Order Modal State
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderProduct, setOrderProduct] = useState<any>(null);
  const [orderQuantity, setOrderQuantity] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [kpiRes, salesRes, productsRes, trendRes, clearanceRes] = await Promise.all([
        api.get('/dashboard/kpis'),
        api.get('/sales?limit=10'),
        api.get('/products'),
        api.get('/dashboard/sales_trend'),
        api.get('/inventory/clearance_suggestions')
      ]);
      setKpis(kpiRes.data);
      setClearanceItems(clearanceRes.data);
      
      const prods = productsRes.data;
      const recentSalesFormatted = salesRes.data.slice(0, 7).map((sale: any) => {
        const prod = sale.product || prods.find((p: any) => p.id === sale.product_id);
        return {
          id: sale.id,
          productName: prod?.name || `Product #${sale.product_id}`,
          quantity: sale.quantity,
          date: new Date(sale.timestamp).toLocaleString('en-IN', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }),
          revenue: sale.total_price
        };
      });
      setSalesData(recentSalesFormatted);
      
      setTrendData(trendRes.data);

      const lowStock = productsRes.data.filter((p: any) => p.stock < 10);
      setLowStockProducts(lowStock);
      
    } catch (error) {
      console.error("Failed to fetch dashboard data", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyDiscount = async (item: any) => {
    try {
      await api.post('/inventory/apply_discount', {
        product_id: item.product_id,
        discount_percent: item.discount_percent,
        discounted_price: item.discounted_price
      });
      alert(`Applied ${item.discount_percent}% clearance markdown to ${item.product_name}. New price: ₹${item.discounted_price}`);
      fetchData();
    } catch (err) {
      alert("Failed to apply discount");
    }
  };

  const handleOrderSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
     if (!orderProduct || orderQuantity <= 0) return;
     try {
        await api.put(`/products/${orderProduct.id}`, {
           ...orderProduct,
           stock: orderProduct.stock + orderQuantity
        });
        alert(`Successfully ordered ${orderQuantity} units of ${orderProduct.name}.`);
        setShowOrderModal(false);
        setOrderQuantity(0);
        fetchData(); // refresh dashboard data
     } catch (error) {
        console.error("Failed to place order", error);
     }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-[80vh]">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-terracotta"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Overview</h1>
        <p className="text-indigo/70">Welcome back, <strong>Malabar Spices Co.</strong>! Here's what's happening with your inventory today.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="glass-card p-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-indigo/70 uppercase">Total Sales</p>
            <h2 className="text-3xl font-bold mt-1 text-terracotta">{formatCurrency(kpis.total_revenue)}</h2>
          </div>
          <div className="bg-terracotta/10 p-3 rounded-full text-terracotta">
            <IndianRupee size={28} />
          </div>
        </div>
        
        <div className="glass-card p-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-indigo/70 uppercase">Inventory Value</p>
            <h2 className="text-3xl font-bold mt-1 text-saffron">{formatCurrency(kpis.inventory_valuation)}</h2>
          </div>
          <div className="bg-saffron/10 p-3 rounded-full text-saffron">
            <TrendingUp size={28} />
          </div>
        </div>

        <div className="glass-card p-6 flex items-center justify-between border-l-4 border-l-red-500">
          <div>
            <p className="text-sm font-medium text-indigo/70 uppercase">Low Stock Alerts</p>
            <h2 className="text-3xl font-bold mt-1 text-red-600">{lowStockProducts.length}</h2>
          </div>
          <div className="bg-red-100 p-3 rounded-full text-red-500">
            <AlertCircle size={28} />
          </div>
        </div>
      </div>

      {/* AI Smart Markdown Clearance Alert */}
      {clearanceItems.length > 0 && (
        <div className="mb-8 p-4 rounded-xl glass-card border border-amber-300 bg-gradient-to-r from-amber-50/80 via-white to-amber-50/30 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-amber-500 text-white rounded-lg">
                <Zap size={18} />
              </span>
              <h4 className="font-bold text-indigo text-base">
                AI Clearance Suggestions ({clearanceItems.length} Near-Expiry Items)
              </h4>
            </div>
            <a href="/inventory" className="text-xs font-bold text-amber-800 hover:underline">
              Manage in Inventory &rarr;
            </a>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {clearanceItems.slice(0, 3).map((item) => (
              <div key={item.product_id} className="bg-white p-3 rounded-lg border border-amber-200/80 flex justify-between items-center text-xs">
                <div>
                  <p className="font-bold text-indigo">{item.product_name}</p>
                  <p className="text-indigo/60 text-[11px] mt-0.5">
                    {item.days_to_expiry < 0 ? `Expired ${Math.abs(item.days_to_expiry)}d ago` : `Expiring in ${item.days_to_expiry}d`} • {item.units_at_risk} units
                  </p>
                  <div className="mt-1">
                    <span className="line-through text-indigo/40 mr-1 font-medium">₹{item.current_price}</span>
                    <span className="font-bold text-green-700">₹{item.discounted_price}</span>
                    <span className="ml-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded">
                      -{item.discount_percent}%
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleApplyDiscount(item)}
                  disabled={item.current_price <= item.discounted_price}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-1 px-2.5 rounded text-[11px] transition-colors flex items-center gap-1 disabled:opacity-50"
                >
                  <Tag size={12} />
                  {item.current_price <= item.discounted_price ? "Done" : "Apply"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Sales Chart */}
        <div className="glass-card p-6 h-[400px]">
          <h3 className="text-xl font-bold mb-6">Sales Trend & Forecast</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trendData} margin={{ top: 20, right: 20, bottom: 25, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" vertical={false} />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#666'}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#666'}} tickFormatter={(val) => `₹${val}`} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} cursor={{fill: '#f5f5f5'}} />
              
              <Legend verticalAlign="top" height={36}/>
              
              <Bar 
                dataKey="actual_revenue" 
                name="Actual Sales"
                fill="#C04000" 
                radius={[4, 4, 0, 0]} 
                label={{ 
                  position: 'top', 
                  formatter: (value: number) => value > 0 ? `₹${Math.round(value).toLocaleString('en-IN')}` : '', 
                  fill: '#C04000', 
                  fontSize: 12, 
                  fontWeight: 'bold' 
                }} 
              />
              <Bar 
                dataKey="predicted_revenue" 
                name="AI Forecast"
                fill="#FF9933" 
                radius={[4, 4, 0, 0]} 
                label={{ 
                  position: 'top', 
                  formatter: (value: number) => value > 0 ? `₹${Math.round(value).toLocaleString('en-IN')}` : '', 
                  fill: '#FF9933', 
                  fontSize: 12, 
                  fontWeight: 'bold' 
                }} 
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Forecast Widget */}
        <div className="glass-card p-6 flex flex-col justify-between bg-gradient-to-br from-ivory to-saffron/20 border-saffron/40">
          <div>
             <div className="flex items-center gap-2 mb-4">
                <span className="px-2 py-1 bg-terracotta text-white text-xs font-bold rounded">ACTION REQUIRED</span>
                <h3 className="text-xl font-bold">Items to Restock</h3>
             </div>
             
             <ul className="space-y-4 max-h-[220px] overflow-y-auto pr-2">
                {lowStockProducts.length > 0 ? lowStockProducts.map((p: any) => (
                   <li key={p.id} className="flex justify-between items-center p-3 bg-white/60 rounded-lg shadow-sm border border-red-100">
                      <div>
                        <p className="font-semibold">{p.name}</p>
                        <p className="text-xs text-red-500 font-bold">Only {p.stock} units left</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right mr-2">
                           <p className="text-[10px] text-indigo/60 uppercase font-bold">ML Suggests</p>
                           <p className="text-sm font-bold text-terracotta">{p.suggested_order_level} units</p>
                        </div>
                        <button 
                          onClick={() => { setOrderProduct(p); setOrderQuantity(p.suggested_order_level || 10); setShowOrderModal(true); }}
                          className="bg-indigo text-white text-xs px-3 py-1.5 rounded hover:bg-indigo/80 font-bold flex items-center gap-1 shadow"
                        >
                          <ShoppingCart size={14} /> ORDER
                        </button>
                      </div>
                   </li>
                )) : (
                   <div className="text-center text-indigo/50 mt-10">
                      <p>All items are sufficiently stocked!</p>
                   </div>
                )}
             </ul>
          </div>
          <div className="mt-6 text-center">
             <a href="/forecasting" className="inline-block px-4 py-2 border-2 border-terracotta text-terracotta font-semibold rounded-lg hover:bg-terracotta hover:text-white transition-colors w-full">
               View Demand Forecasts
             </a>
          </div>
        </div>
      </div>

      {/* Raw Numbers / Recent Sales Table */}
      <div className="glass-card p-6">
        <div className="flex justify-between items-center mb-6">
           <h3 className="text-xl font-bold">Recent Transactions (Numbers)</h3>
           <a href="/sales" className="text-sm font-semibold text-terracotta hover:underline">View All Sales &rarr;</a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-indigo/5 border-b border-indigo/10">
              <tr>
                <th className="p-3 font-semibold text-indigo">Product</th>
                <th className="p-3 font-semibold text-indigo">Quantity</th>
                <th className="p-3 font-semibold text-indigo">Date & Time</th>
                <th className="p-3 font-semibold text-indigo text-right">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {salesData.map((data: any, idx: number) => (
                <tr key={idx} className="border-b border-indigo/5 hover:bg-white/50">
                  <td className="p-3 font-semibold text-indigo">{data.productName}</td>
                  <td className="p-3 text-indigo/80 font-medium">{data.quantity} units</td>
                  <td className="p-3 text-indigo/70 text-sm">{data.date}</td>
                  <td className="p-3 text-right font-bold text-terracotta">{formatCurrency(data.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Modal */}
      {showOrderModal && orderProduct && (
        <div className="fixed inset-0 bg-indigo/50 flex items-center justify-center z-[100] backdrop-blur-sm">
          <div className="bg-white rounded-xl p-8 max-w-md w-full shadow-2xl relative">
            <button onClick={() => setShowOrderModal(false)} className="absolute top-4 right-4 text-indigo/60 hover:text-indigo">
              <X size={24} />
            </button>
            <h2 className="text-2xl font-bold mb-2 text-indigo">Order from Vendor</h2>
            <p className="text-sm text-indigo/70 mb-6">Placing an order with <strong>{orderProduct.supplier}</strong> for <strong>{orderProduct.name}</strong>.</p>
            
            <form onSubmit={handleOrderSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-indigo mb-1">Order Quantity</label>
                <input 
                  required 
                  type="number" 
                  min="1"
                  value={orderQuantity} 
                  onChange={e => setOrderQuantity(parseInt(e.target.value))} 
                  className="w-full p-2 rounded border border-indigo/20 focus:outline-none focus:border-terracotta text-lg font-bold" 
                />
              </div>
              <div className="p-3 bg-saffron/10 rounded-lg border border-saffron/30">
                 <p className="text-xs text-saffron-800">Current Stock: {orderProduct.stock} units</p>
                 <p className="text-xs font-bold text-saffron-800 mt-1">New Stock will be: {orderProduct.stock + (orderQuantity || 0)} units</p>
              </div>
              <button type="submit" className="w-full bg-indigo text-white py-3 rounded-lg font-bold hover:bg-indigo/90 transition-colors mt-6 flex items-center justify-center gap-2">
                <ShoppingCart size={20} />
                Confirm Order
              </button>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
