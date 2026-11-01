from pydantic import BaseModel
from datetime import datetime
from typing import Optional

# User Schemas
class UserBase(BaseModel):
    username: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: str | None = None

# Product Schemas
class ProductBase(BaseModel):
    name: str
    sku: str
    category: str
    price: float
    stock: int
    supplier: str
    expiry_date: Optional[datetime] = None

class ProductCreate(ProductBase):
    pass

class Product(ProductBase):
    id: int
    suggested_order_level: Optional[int] = 0

    class Config:
        from_attributes = True

# Sale Schemas
class SaleCreate(BaseModel):
    product_id: int
    quantity: int
    total_price: Optional[float] = None

class Sale(BaseModel):
    id: int
    product_id: int
    quantity: int
    total_price: float
    timestamp: datetime
    product: Optional[Product] = None

    class Config:
        from_attributes = True

# ML Forecast Schema
class FestivalSurgeInfo(BaseModel):
    name: str
    date: str
    days_away: int
    surge_percent: int
    description: str

class ForecastRequest(BaseModel):
    product_id: int
    days_to_predict: int = 30

class ForecastResponse(BaseModel):
    product_id: int
    forecast: list[float]
    festivals_detected: list[FestivalSurgeInfo] = []
    baseline_demand: float = 0.0
    peak_demand: float = 0.0
    peak_day: str = ""

# Smart Clearance / Markdown Schemas
class ClearanceSuggestion(BaseModel):
    product_id: int
    product_name: str
    category: str
    current_price: float
    discount_percent: int
    discounted_price: float
    days_to_expiry: int
    units_at_risk: int
    potential_loss_avoided: float
    reason: str

class ApplyDiscountRequest(BaseModel):
    product_id: int
    discount_percent: int
    discounted_price: float

# Market Basket / Cross-Sell Schemas
class CrossSellItem(BaseModel):
    product_id: int
    name: str
    category: str
    price: float
    stock: int
    confidence: float
    bundle_reason: str

class CrossSellResponse(BaseModel):
    primary_product_id: int
    primary_product_name: str
    recommendations: list[CrossSellItem]
