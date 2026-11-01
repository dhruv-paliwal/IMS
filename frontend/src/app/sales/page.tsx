"use client";

import { useEffect, useState, useRef } from "react";
import AppLayout from "@/components/AppLayout";
import { formatCurrency } from "@/utils/currency";
import api from "@/utils/api";
import { Camera, Search, X, Sparkles, Check, Plus } from "lucide-react";
import { Html5QrcodeScanner } from "html5-qrcode";

export default function Sales() {
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showManualModal, setShowManualModal] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [newSale, setNewSale] = useState({ product_id: "", quantity: 1, total_price: 0 });
  const [crossSellRecs, setCrossSellRecs] = useState<any[]>([]);
  const [addedBundles, setAddedBundles] = useState<any[]>([]);
  const [scanResult, setScanResult] = useState<string | null>(null);
  
  // Auto-calculate price and fetch Cross-Sell recommendations
  useEffect(() => {
     if (newSale.product_id) {
        const product = products.find((p: any) => p.id === parseInt(newSale.product_id));
        if (product) {
           const bundlesTotal = addedBundles.reduce((acc, b) => acc + b.price, 0);
           setNewSale(prev => ({ ...prev, total_price: (product.price * prev.quantity) + bundlesTotal }));

           // Fetch AI Market Basket cross-sell recommendations
           api.get(`/ml/cross_sell/${newSale.product_id}`)
             .then(res => setCrossSellRecs(res.data.recommendations || []))
             .catch(err => console.error("Cross sell error", err));
        }
     } else {
        setCrossSellRecs([]);
        setAddedBundles([]);
     }
  }, [newSale.product_id, newSale.quantity, products]);

  const handleAddBundle = (bundleItem: any) => {
    if (addedBundles.some(b => b.product_id === bundleItem.product_id)) {
      // remove
      const updated = addedBundles.filter(b => b.product_id !== bundleItem.product_id);
      setAddedBundles(updated);
      setNewSale(prev => ({ ...prev, total_price: Math.max(0, prev.total_price - bundleItem.price) }));
    } else {
      // add
      setAddedBundles(prev => [...prev, bundleItem]);
      setNewSale(prev => ({ ...prev, total_price: prev.total_price + bundleItem.price }));
    }
  };

  useEffect(() => {
    fetchSales();
    fetchProducts();
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("modal") === "manual") {
        setShowManualModal(true);
        setNewSale({ product_id: "2", quantity: 2, total_price: 500 });
      }
    }
  }, []);

  const fetchSales = async () => {
    try {
      const res = await api.get('/sales');
      setSales(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products');
      setProducts(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Calculate primary product portion of total price
      const primaryProduct = products.find((p: any) => p.id === parseInt(newSale.product_id));
      const primaryPrice = primaryProduct ? primaryProduct.price * newSale.quantity : newSale.total_price;

      // 1. Post primary product sale
      await api.post('/sales', {
        product_id: parseInt(newSale.product_id),
        quantity: newSale.quantity,
        total_price: primaryPrice
      });

      // 2. Post any cross-sell bundled items
      for (const bundle of addedBundles) {
        await api.post('/sales', {
          product_id: bundle.product_id,
          quantity: 1,
          total_price: bundle.price
        });
      }

      setShowManualModal(false);
      const bundleMsg = addedBundles.length > 0 ? ` with ${addedBundles.length} AI cross-sell item(s)` : "";
      alert(`Sale recorded successfully${bundleMsg}!`);
      setNewSale({ product_id: "", quantity: 1, total_price: 0 });
      setAddedBundles([]);
      setCrossSellRecs([]);
      fetchSales();
      fetchProducts();
    } catch (error: any) {
      alert(error.response?.data?.detail || "Failed to add sale");
    }
  };

  const handleSelectSKU = (sku: string) => {
    const matchedProduct = products.find((p: any) => p.sku === sku);
    if (matchedProduct) {
      if (matchedProduct.expiry_date && new Date(matchedProduct.expiry_date) < new Date()) {
        alert(`CANNOT SELL: '${matchedProduct.name}' has EXPIRED! Selling expired items is strictly prohibited. Please discard from shelves.`);
        return;
      }
      setNewSale({ product_id: matchedProduct.id.toString(), quantity: 1, total_price: matchedProduct.price });
      setShowScanModal(false);
      setShowManualModal(true);
    }
  };

  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;
    let timer: NodeJS.Timeout | null = null;

    if (showScanModal) {
      timer = setTimeout(() => {
        try {
          scanner = new Html5QrcodeScanner(
            "reader",
            { 
              fps: 10, 
              qrbox: { width: 250, height: 250 },
              rememberLastUsedCamera: true
            },
            false
          );
          scanner.render(
            (decodedText) => {
              setScanResult(decodedText);
              const matchedProduct = products.find(
                (p: any) => p.sku.toLowerCase() === decodedText.trim().toLowerCase() || p.id.toString() === decodedText.trim()
              );
              if (matchedProduct) {
                 if (matchedProduct.expiry_date && new Date(matchedProduct.expiry_date) < new Date()) {
                    alert(`CANNOT SELL: '${matchedProduct.name}' has EXPIRED! Selling expired items is strictly prohibited. Please discard from shelves.`);
                    scanner?.clear();
                    setShowScanModal(false);
                    return;
                 }
                 setNewSale({ product_id: matchedProduct.id.toString(), quantity: 1, total_price: matchedProduct.price });
                 setShowScanModal(false);
                 setShowManualModal(true);
              } else {
                 alert(`Product with SKU or ID "${decodedText}" not found!`);
              }
              scanner?.clear();
            },
            (error) => {
              // frame scanning message, ignore
            }
          );
        } catch (err) {
          console.error("Camera scanner initialization error:", err);
        }
      }, 150);
    }

    return () => {
      if (timer) clearTimeout(timer);
      if (scanner) {
        scanner.clear().catch(console.error);
      }
    };
  }, [showScanModal, products]);

  return (
    <AppLayout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Sales & Billing</h1>
          <p className="text-indigo/70">View past transactions and log new sales.</p>
        </div>
        <div className="flex gap-4">
          <button onClick={() => setShowManualModal(true)} className="bg-white border-2 border-terracotta text-terracotta px-4 py-2 rounded-lg font-semibold hover:bg-terracotta/5 transition-all shadow-sm flex items-center gap-2">
            <Search size={18} />
            Manual Entry
          </button>
          <button onClick={() => setShowScanModal(true)} className="bg-terracotta text-white px-6 py-2 rounded-lg font-semibold hover:bg-saffron transition-all shadow-md flex items-center gap-2">
            <Camera size={20} />
            Smart Scan
          </button>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-indigo/5 border-b border-indigo/10">
            <tr>
              <th className="p-4 font-semibold text-indigo">Sale ID</th>
              <th className="p-4 font-semibold text-indigo">Product</th>
              <th className="p-4 font-semibold text-indigo">Quantity</th>
              <th className="p-4 font-semibold text-indigo">Total Bill Amount</th>
              <th className="p-4 font-semibold text-indigo">Date & Time</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center p-8">Loading...</td>
              </tr>
            ) : sales.map((sale: any) => {
              const matchedProduct = products.find((p: any) => p.id === sale.product_id);
              const productName = sale.product?.name || matchedProduct?.name || `Product #${sale.product_id}`;
              const productCategory = sale.product?.category || matchedProduct?.category;
              return (
                <tr key={sale.id} className="border-b border-indigo/5 hover:bg-white/50 transition-colors">
                  <td className="p-4 font-medium text-indigo/70">#{sale.id.toString().padStart(4, '0')}</td>
                  <td className="p-4">
                    <div className="font-semibold text-indigo">{productName}</div>
                    {productCategory && (
                      <span className="text-xs text-indigo/60 bg-saffron/10 px-2 py-0.5 rounded font-medium">
                        {productCategory}
                      </span>
                    )}
                  </td>
                  <td className="p-4 font-medium">{sale.quantity} units</td>
                  <td className="p-4 font-bold text-terracotta">{formatCurrency(sale.total_price)}</td>
                  <td className="p-4 text-indigo/70 font-medium">
                    {new Date(sale.timestamp).toLocaleString('en-IN', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric',
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showManualModal && (
        <div className="fixed inset-0 bg-indigo/50 flex items-center justify-center z-[100] backdrop-blur-sm">
          <div className="bg-white rounded-xl p-8 max-w-md w-full shadow-2xl relative">
            <button onClick={() => setShowManualModal(false)} className="absolute top-4 right-4 text-indigo/60 hover:text-indigo">
              <X size={24} />
            </button>
            <h2 className="text-2xl font-bold mb-6 text-indigo">Log Sale</h2>
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-indigo mb-1">Product</label>
                <select 
                  required 
                  value={newSale.product_id} 
                  onChange={e => setNewSale({...newSale, product_id: e.target.value})} 
                  className="w-full p-2 rounded border border-indigo/20 focus:outline-none focus:border-terracotta"
                >
                  <option value="" disabled>Select a product...</option>
                  {products.map((p: any) => {
                    const isExp = p.expiry_date && new Date(p.expiry_date) < new Date();
                    return (
                      <option key={p.id} value={p.id} disabled={isExp} className={isExp ? 'text-red-500 bg-red-50' : ''}>
                        {p.name} {isExp ? '(EXPIRED - CANNOT SELL)' : `(Stock: ${p.stock})`}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-indigo mb-1">Quantity</label>
                  <input 
                    required 
                    type="number" 
                    min="1"
                    value={newSale.quantity} 
                    onChange={e => setNewSale({...newSale, quantity: parseInt(e.target.value)})} 
                    className="w-full p-2 rounded border border-indigo/20 focus:outline-none focus:border-terracotta" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-indigo mb-1">Total Bill Amount (₹)</label>
                  <input 
                    required 
                    type="number" 
                    step="0.01"
                    min="0"
                    value={newSale.total_price} 
                    onChange={e => setNewSale({...newSale, total_price: parseFloat(e.target.value)})} 
                    className="w-full p-2 rounded border border-indigo/20 focus:outline-none focus:border-terracotta font-bold text-terracotta" 
                  />
                </div>
              </div>

              {/* AI Market Basket Cross-Sell Recommendations */}
              {crossSellRecs.length > 0 && (
                <div className="p-3 bg-gradient-to-r from-saffron/10 to-amber-50 rounded-lg border border-saffron/30 space-y-2">
                   <div className="flex items-center gap-1.5">
                     <Sparkles size={16} className="text-saffron" />
                     <span className="text-xs font-bold text-indigo">AI Cross-Sell Recommendations</span>
                   </div>
                   <p className="text-[11px] text-indigo/70">Customers frequently buy these items together:</p>
                   <div className="space-y-1.5">
                     {crossSellRecs.map((item) => {
                       const isAdded = addedBundles.some(b => b.product_id === item.product_id);
                       return (
                         <div key={item.product_id} className="flex justify-between items-center bg-white/90 p-2 rounded border border-saffron/20 text-xs">
                           <div>
                             <div className="flex items-center gap-1.5">
                               <span className="font-bold text-indigo">{item.name}</span>
                               <span className="text-[10px] text-saffron-800 font-bold bg-saffron/20 px-1.5 py-0.2 rounded-full">
                                 {Math.round(item.confidence * 100)}% match
                               </span>
                             </div>
                             <p className="text-[10px] text-indigo/60">{item.bundle_reason}</p>
                           </div>
                           <button
                             type="button"
                             onClick={() => handleAddBundle(item)}
                             className={`ml-2 py-1 px-2.5 rounded text-[11px] font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
                               isAdded
                                 ? 'bg-green-600 text-white hover:bg-green-700'
                                 : 'bg-indigo hover:bg-terracotta text-white'
                             }`}
                           >
                             {isAdded ? (
                               <>
                                 <Check size={12} />
                                 Added
                               </>
                             ) : (
                               <>
                                 <Plus size={12} />
                                 Add ₹{item.price}
                               </>
                             )}
                           </button>
                         </div>
                       );
                     })}
                   </div>
                </div>
              )}

              <button type="submit" className="w-full bg-terracotta text-white py-3 rounded-lg font-bold hover:bg-saffron transition-colors mt-6 shadow-md">
                Log Sale {addedBundles.length > 0 ? `(${1 + addedBundles.length} items - ₹${newSale.total_price})` : `(₹${newSale.total_price})`}
              </button>
            </form>
          </div>
        </div>
      )}

      {showScanModal && (
        <div className="fixed inset-0 bg-indigo/50 flex items-center justify-center z-[100] backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowScanModal(false)} className="absolute top-4 right-4 text-indigo/60 hover:text-indigo z-10">
              <X size={24} />
            </button>
            <h2 className="text-2xl font-bold mb-2 text-indigo">Scan Barcode / QR Code</h2>
            <p className="text-xs text-indigo/70 mb-4">
              Point your webcam or phone camera at the product barcode, or select an image file below.
            </p>
            
            <div id="reader" className="w-full bg-indigo/5 rounded-lg p-2 min-h-[280px]"></div>

            {/* Troubleshooting & Test Barcodes */}
            <div className="mt-4 pt-4 border-t border-indigo/10 space-y-3">
              <div className="bg-amber-50 border border-amber-200 rounded p-2 text-xs text-amber-800">
                <strong>Camera Permission:</strong> If your camera doesn't start, ensure you clicked <em>&quot;Allow&quot;</em> on your browser prompt or check the camera/lock icon in your browser address bar.
              </div>

              <div>
                <p className="text-xs font-semibold text-indigo/70 mb-1.5">Or test immediately with sample product SKUs:</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: "Turmeric", sku: "SP-TUR-01" },
                    { label: "Basmati Rice", sku: "GR-BAS-02" },
                    { label: "Kashmiri Chilli", sku: "SP-CHI-03" },
                    { label: "Desi Ghee", sku: "DA-GHE-11" },
                  ].map((item) => (
                    <button
                      key={item.sku}
                      type="button"
                      onClick={() => handleSelectSKU(item.sku)}
                      className="text-xs bg-indigo/5 hover:bg-terracotta hover:text-white px-2.5 py-1.5 rounded border border-indigo/10 font-mono transition-colors"
                      title={`Simulate scanning ${item.sku}`}
                    >
                      {item.label} ({item.sku})
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
