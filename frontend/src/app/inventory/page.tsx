"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { formatCurrency } from "@/utils/currency";
import api from "@/utils/api";
import { Edit2, Trash2, AlertCircle, X, ShoppingCart, Clock, Tag, Zap } from "lucide-react";

export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [clearanceItems, setClearanceItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyingDiscount, setApplyingDiscount] = useState<number | null>(null);
  
  // Add Product State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: "", sku: "", category: "Spices", price: 0, stock: 0, supplier: "", expiry_date: ""
  });

  // Order State
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderProduct, setOrderProduct] = useState<any>(null);
  const [orderQuantity, setOrderQuantity] = useState(0);

  useEffect(() => {
    fetchProducts();
    fetchClearance();
  }, []);

  const fetchClearance = async () => {
    try {
      const res = await api.get('/inventory/clearance_suggestions');
      setClearanceItems(res.data);
    } catch (err) {
      console.error("Failed to fetch clearance suggestions", err);
    }
  };

  const handleApplyDiscount = async (item: any) => {
    setApplyingDiscount(item.product_id);
    try {
      await api.post('/inventory/apply_discount', {
        product_id: item.product_id,
        discount_percent: item.discount_percent,
        discounted_price: item.discounted_price
      });
      alert(`Success! Applied ${item.discount_percent}% clearance markdown to ${item.product_name}. New price: ₹${item.discounted_price}`);
      fetchProducts();
      fetchClearance();
    } catch (err) {
      alert("Failed to apply discount");
    } finally {
      setApplyingDiscount(null);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products');
      setProducts(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/products', {
         ...newProduct, 
         expiry_date: newProduct.expiry_date ? new Date(newProduct.expiry_date).toISOString() : null
      });
      setShowAddModal(false);
      setNewProduct({ name: "", sku: "", category: "Spices", price: 0, stock: 0, supplier: "", expiry_date: "" });
      fetchProducts();
    } catch (error) {
      console.error("Failed to add product", error);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this product?")) {
      try {
        await api.delete(`/products/${id}`);
        fetchProducts();
      } catch (error) {
        console.error("Failed to delete product", error);
      }
    }
  };

  const handleOrderSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
     if (!orderProduct || orderQuantity <= 0) return;
     try {
        // Send a PUT request to update stock
        await api.put(`/products/${orderProduct.id}`, {
           ...orderProduct,
           stock: orderProduct.stock + orderQuantity
        });
        alert(`Successfully ordered ${orderQuantity} units of ${orderProduct.name} from ${orderProduct.supplier}. Stock updated!`);
        setShowOrderModal(false);
        setOrderQuantity(0);
        fetchProducts();
     } catch (error) {
        console.error("Failed to place order", error);
     }
  };

  const isExpired = (dateString: string) => {
     if (!dateString) return false;
     return new Date(dateString) < new Date();
  };

  return (
    <AppLayout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Inventory Management</h1>
          <p className="text-indigo/70">Track your products, stock levels, expiry dates, and pricing.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-terracotta text-white px-6 py-2 rounded-lg font-semibold hover:bg-saffron transition-all shadow-md"
        >
          + Add Product
        </button>
      </div>

      {/* AI Smart Markdown & Clearance Engine */}
      {clearanceItems.length > 0 && (
        <div className="mb-8 glass-card p-6 border-l-4 border-l-amber-500 bg-gradient-to-r from-amber-50/40 via-white/80 to-transparent">
          <div className="flex items-center justify-between mb-4">
             <div className="flex items-center gap-2.5">
               <div className="p-2 bg-amber-500 text-white rounded-lg">
                 <Zap size={22} />
               </div>
               <div>
                 <h3 className="text-xl font-bold text-indigo flex items-center gap-2">
                   Smart Clearance & Markdown Recommendations
                   <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                     {clearanceItems.length} Products at Expiry Risk
                   </span>
                 </h3>
                 <p className="text-xs text-indigo/70">
                   Automated AI pricing engine recommends liquidation discounts before near-expiry products result in total loss.
                 </p>
               </div>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {clearanceItems.map((item) => (
              <div key={item.product_id} className="bg-white/90 p-4 rounded-xl border border-amber-200/80 shadow-sm flex flex-col justify-between">
                <div>
                   <div className="flex justify-between items-start gap-1 mb-1">
                     <h4 className="font-bold text-indigo text-sm leading-tight">{item.product_name}</h4>
                     <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase bg-amber-100 text-amber-800">
                       Expiring in {item.days_to_expiry}d
                     </span>
                   </div>
                   <p className="text-[11px] text-indigo/60">{item.reason}</p>
                   
                   <div className="mt-3 p-2 bg-indigo/5 rounded-lg text-xs space-y-1">
                     <div className="flex justify-between">
                       <span className="text-indigo/60">Stock at Risk:</span>
                       <span className="font-bold text-red-600">{item.units_at_risk} units</span>
                     </div>
                     <div className="flex justify-between items-baseline">
                       <span className="text-indigo/60">Price Markdown:</span>
                       <div>
                         <span className="line-through text-indigo/40 mr-1.5 font-medium">₹{item.current_price}</span>
                         <span className="font-bold text-green-700 text-sm">₹{item.discounted_price}</span>
                       </div>
                     </div>
                   </div>
                </div>

                <button
                  onClick={() => handleApplyDiscount(item)}
                  disabled={applyingDiscount === item.product_id || item.current_price <= item.discounted_price}
                  className="mt-3 w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-1.5 px-3 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Tag size={13} />
                  {item.current_price <= item.discounted_price 
                    ? "Discount Applied" 
                    : applyingDiscount === item.product_id ? "Applying..." : `Apply -${item.discount_percent}% Markdown`}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="glass-card overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-indigo/5 border-b border-indigo/10">
            <tr>
              <th className="p-4 font-semibold text-indigo">Product Name</th>
              <th className="p-4 font-semibold text-indigo">SKU</th>
              <th className="p-4 font-semibold text-indigo">Category</th>
              <th className="p-4 font-semibold text-indigo">Price</th>
              <th className="p-4 font-semibold text-indigo">Stock & Status</th>
              <th className="p-4 font-semibold text-indigo text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center p-8">Loading...</td>
              </tr>
            ) : products.map((product: any) => {
              const expired = isExpired(product.expiry_date);
              const lowStock = product.stock < 10;
              return (
              <tr key={product.id} className={`border-b border-indigo/5 hover:bg-white/50 transition-colors ${expired ? 'bg-red-50/50' : ''}`}>
                <td className="p-4 font-medium">
                  {product.name}
                  {expired && <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold uppercase">Expired (Do Not Sell)</span>}
                </td>
                <td className="p-4 text-indigo/70 text-sm">{product.sku}</td>
                <td className="p-4">
                   <span className="px-2 py-1 bg-saffron/20 text-saffron-800 text-xs font-bold rounded-full">{product.category}</span>
                </td>
                <td className="p-4 font-semibold">{formatCurrency(product.price)}</td>
                <td className="p-4">
                   <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${lowStock ? 'text-red-600' : 'text-green-600'}`}>
                          {product.stock} units
                        </span>
                        {lowStock && <span title="Low Stock"><AlertCircle size={16} className="text-red-500" /></span>}
                      </div>
                      {product.expiry_date && (
                         <div className="flex items-center gap-1 text-xs text-indigo/60 mt-1">
                           <Clock size={12} />
                           {new Date(product.expiry_date).toLocaleDateString()}
                         </div>
                      )}
                   </div>
                </td>
                <td className="p-4 flex gap-3 justify-end">
                  {lowStock && (
                     <button 
                       onClick={() => { setOrderProduct(product); setShowOrderModal(true); }}
                       className="text-xs bg-indigo text-white px-3 py-1 rounded hover:bg-indigo/80 font-semibold flex items-center gap-1"
                     >
                       <ShoppingCart size={14} /> Order
                     </button>
                  )}
                  <button className="text-indigo/60 hover:text-terracotta"><Edit2 size={18} /></button>
                  <button onClick={() => handleDelete(product.id)} className="text-indigo/60 hover:text-red-500"><Trash2 size={18} /></button>
                </td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-indigo/50 flex items-center justify-center z-[100] backdrop-blur-sm">
          <div className="bg-white rounded-xl p-8 max-w-md w-full shadow-2xl relative">
            <button onClick={() => setShowAddModal(false)} className="absolute top-4 right-4 text-indigo/60 hover:text-indigo">
              <X size={24} />
            </button>
            <h2 className="text-2xl font-bold mb-6 text-indigo">Add New Product</h2>
            <form onSubmit={handleAddProduct} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-indigo mb-1">Product Name</label>
                <input required type="text" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full p-2 rounded border border-indigo/20 focus:outline-none focus:border-terracotta" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-indigo mb-1">SKU</label>
                  <input required type="text" value={newProduct.sku} onChange={e => setNewProduct({...newProduct, sku: e.target.value})} className="w-full p-2 rounded border border-indigo/20 focus:outline-none focus:border-terracotta" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-indigo mb-1">Category</label>
                  <select value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} className="w-full p-2 rounded border border-indigo/20 focus:outline-none focus:border-terracotta">
                    <option>Spices</option>
                    <option>Grains</option>
                    <option>Oils</option>
                    <option>Beverages</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-indigo mb-1">Price (₹)</label>
                  <input required type="number" step="0.01" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: parseFloat(e.target.value)})} className="w-full p-2 rounded border border-indigo/20 focus:outline-none focus:border-terracotta" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-indigo mb-1">Initial Stock</label>
                  <input required type="number" value={newProduct.stock} onChange={e => setNewProduct({...newProduct, stock: parseInt(e.target.value)})} className="w-full p-2 rounded border border-indigo/20 focus:outline-none focus:border-terracotta" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-indigo mb-1">Supplier</label>
                  <input required type="text" value={newProduct.supplier} onChange={e => setNewProduct({...newProduct, supplier: e.target.value})} className="w-full p-2 rounded border border-indigo/20 focus:outline-none focus:border-terracotta" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-indigo mb-1">Expiry Date</label>
                  <input type="date" value={newProduct.expiry_date} onChange={e => setNewProduct({...newProduct, expiry_date: e.target.value})} className="w-full p-2 rounded border border-indigo/20 focus:outline-none focus:border-terracotta text-sm" />
                </div>
              </div>
              <button type="submit" className="w-full bg-terracotta text-white py-3 rounded-lg font-bold hover:bg-saffron transition-colors mt-6">
                Save Product
              </button>
            </form>
          </div>
        </div>
      )}

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
