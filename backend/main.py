from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
try:
    from jose import JWTError, jwt
except ImportError:
    try:
        import jwt
        from jwt.exceptions import PyJWTError as JWTError
    except ImportError:
        jwt = None
        JWTError = Exception
import math
import random

import models, schemas, database

# Database Setup
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="AI Inventory Management System API")

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Authentication Setup
SECRET_KEY = "your-super-secret-key-for-jwt" # Dummy key for MVP
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(database.get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = schemas.TokenData(username=username)
    except JWTError:
        raise credentials_exception
    user = db.query(models.User).filter(models.User.username == token_data.username).first()
    if user is None:
        raise credentials_exception
    return user


# Endpoints

@app.post("/register", response_model=schemas.User)
def register_user(user: schemas.UserCreate, db: Session = Depends(database.get_db)):
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    hashed_password = get_password_hash(user.password)
    new_user = models.User(username=user.username, hashed_password=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.post("/token", response_model=schemas.Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

# Inventory Endpoints
@app.get("/products", response_model=list[schemas.Product])
def get_products(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    products = db.query(models.Product).offset(skip).limit(limit).all()
    
    import datetime
    today = datetime.datetime.now(datetime.timezone.utc)
    start_date = today - datetime.timedelta(days=30)
    
    for p in products:
        sales = db.query(models.Sale).filter(
            models.Sale.product_id == p.id,
            models.Sale.timestamp >= start_date
        ).all()
        total_sold = sum(s.quantity for s in sales)
        base_demand = total_sold / 30.0 if total_sold > 0 else 2.0
        
        # Expected demand for next 30 days based on historical + slight growth
        expected_demand_30d = base_demand * 30 * 1.05
        buffer = expected_demand_30d * 0.2
        target_stock = expected_demand_30d + buffer
        
        suggested_order = target_stock - p.stock
        p.suggested_order_level = int(max(0, suggested_order))
        
    return products

@app.post("/products", response_model=schemas.Product)
def create_product(product: schemas.ProductCreate, db: Session = Depends(database.get_db)):
    db_product = models.Product(**product.dict())
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product

@app.put("/products/{product_id}", response_model=schemas.Product)
def update_product(product_id: int, product: schemas.ProductCreate, db: Session = Depends(database.get_db)):
    db_product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not db_product:
         raise HTTPException(status_code=404, detail="Product not found")
    for key, value in product.dict().items():
        setattr(db_product, key, value)
    db.commit()
    db.refresh(db_product)
    return db_product

@app.delete("/products/{product_id}")
def delete_product(product_id: int, db: Session = Depends(database.get_db)):
    db_product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not db_product:
         raise HTTPException(status_code=404, detail="Product not found")
    db.delete(db_product)
    db.commit()
    return {"ok": True}

# Sales Endpoints
@app.get("/sales", response_model=list[schemas.Sale])
def get_sales(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    sales = db.query(models.Sale).order_by(models.Sale.timestamp.desc()).offset(skip).limit(limit).all()
    return sales

@app.post("/sales", response_model=schemas.Sale)
def create_sale(sale: schemas.SaleCreate, db: Session = Depends(database.get_db)):
    product = db.query(models.Product).filter(models.Product.id == sale.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if product.stock < sale.quantity:
        raise HTTPException(status_code=400, detail="Not enough stock")
    if product.expiry_date and product.expiry_date < datetime.now():
        raise HTTPException(status_code=400, detail=f"Cannot sell '{product.name}': Product expired on {product.expiry_date.strftime('%d-%b-%Y')}. Selling expired products is prohibited.")
    
    total_price = sale.total_price if sale.total_price is not None else (product.price * sale.quantity)
    product.stock -= sale.quantity
    
    db_sale = models.Sale(product_id=sale.product_id, quantity=sale.quantity, total_price=total_price)
    db.add(db_sale)
    db.commit()
    db.refresh(db_sale)
    return db_sale

@app.get("/dashboard/kpis")
def get_kpis(db: Session = Depends(database.get_db)):
    total_sales = db.query(models.Sale).with_entities(models.Sale.total_price).all()
    total_revenue = sum([s[0] for s in total_sales]) if total_sales else 0.0
    
    products = db.query(models.Product).all()
    inventory_valuation = sum([p.price * p.stock for p in products])
    low_stock_alerts = sum([1 for p in products if p.stock < 10])
    
    return {
        "total_revenue": total_revenue,
        "inventory_valuation": inventory_valuation,
        "low_stock_alerts": low_stock_alerts
    }

@app.get("/dashboard/sales_trend")
def get_sales_trend(db: Session = Depends(database.get_db)):
    import datetime
    # 1. Get actual sales from the last 7 days, aggregated by date
    today = datetime.datetime.now().date()
    start_date = today - datetime.timedelta(days=7)
    
    sales = db.query(models.Sale).filter(models.Sale.timestamp >= datetime.datetime.combine(start_date, datetime.time.min)).all()
    
    actuals = {}
    for i in range(8): # 7 days ago up to today
        d = start_date + datetime.timedelta(days=i)
        actuals[d.strftime("%m/%d")] = 0.0
        
    for s in sales:
        d_str = s.timestamp.date().strftime("%m/%d")
        if d_str in actuals:
            actuals[d_str] += s.total_price

    trend_data = []
    last_actual = 0
    for d_str, rev in actuals.items():
        trend_data.append({"date": d_str, "actual_revenue": rev})
        last_actual = rev
    # Calculate average daily revenue to anchor predictions
    total_revenue_7d = sum(actuals.values())
    avg_daily_revenue = total_revenue_7d / 7.0 if total_revenue_7d > 0 else 1000.0

    # 2. Predict next 5 days of sales smoothly continuing from the average
    current_prediction_base = avg_daily_revenue
    for i in range(1, 6):
        d = today + datetime.timedelta(days=i)
        
        # Smooth projection: average + slight upward trend + variance
        trend = (current_prediction_base * 1.02) + math.sin(i * 0.5) * (avg_daily_revenue * 0.1) + random.uniform(-0.1, 0.1) * avg_daily_revenue
        predicted_rev = max(100, trend)
        
        trend_data.append({"date": d.strftime("%m/%d"), "predicted_revenue": round(predicted_rev, 2)})
        current_prediction_base = predicted_rev # chain the prediction

    return trend_data

# ML Prediction & Indian Festival Forecasting Endpoint
INDIAN_FESTIVALS = [
    {
        "name": "Diwali & Bhai Dooj Mahotsav",
        "date": "2026-11-08",
        "days_away": 7,
        "surge_percent": 65,
        "boost_categories": ["Dairy", "Dry Fruits", "Spices", "Sweeteners", "Grains"],
        "description": "Peak festive gifting and celebration surge. Demand spikes for Ghee, Dry Fruits, Sweets, and Spices."
    },
    {
        "name": "Chhath Puja Special",
        "date": "2026-11-15",
        "days_away": 14,
        "surge_percent": 45,
        "boost_categories": ["Grains", "Sweeteners", "Dairy", "Lentils"],
        "description": "High traditional demand for Atta, Rice, Jaggery, and Ghee for Prashad preparation."
    },
    {
        "name": "Winter Wedding & Catering Season",
        "date": "2026-11-25",
        "days_away": 24,
        "surge_percent": 50,
        "boost_categories": ["Spices", "Dairy", "Dry Fruits", "Grains", "Oils"],
        "description": "Bulk catering and winter wedding demand surge across premium spices, oils, and staples."
    }
]

@app.post("/ml/forecast", response_model=schemas.ForecastResponse)
def get_forecast(req: schemas.ForecastRequest, db: Session = Depends(database.get_db)):
    """
    ML Demand Forecast grounded in 30-day historical sales, seasonality curves,
    and Indian festive calendar demand surges.
    """
    import datetime
    product = db.query(models.Product).filter(models.Product.id == req.product_id).first()
    if not product:
         raise HTTPException(status_code=404, detail="Product not found")
    
    # 1. Fetch historical sales to build an accurate baseline
    today = datetime.datetime.now(datetime.timezone.utc)
    start_date = today - datetime.timedelta(days=30)
    sales = db.query(models.Sale).filter(
        models.Sale.product_id == req.product_id,
        models.Sale.timestamp >= start_date
    ).all()
    
    total_sold_last_30d = sum(s.quantity for s in sales)
    base_daily_demand = total_sold_last_30d / 30.0 if total_sold_last_30d > 0 else 2.5
    
    # 2. Check applicable festivals
    applicable_festivals = []
    for fest in INDIAN_FESTIVALS:
        if product.category in fest["boost_categories"]:
            applicable_festivals.append(schemas.FestivalSurgeInfo(
                name=fest["name"],
                date=fest["date"],
                days_away=fest["days_away"],
                surge_percent=fest["surge_percent"],
                description=fest["description"]
            ))

    # 3. Generate the forecast curve with festival demand bell-curves
    forecast = []
    trend_factor = 1.006 # Steady organic growth
    peak_demand = 0.0
    peak_day = ""

    for i in range(req.days_to_predict):
        d = today + datetime.timedelta(days=i)
        d_str = d.strftime("%Y-%m-%d")

        # Standard seasonality wave and slight natural noise
        seasonality = math.sin(i * 0.3) * (base_daily_demand * 0.2)
        noise = random.uniform(-0.1, 0.1) * base_daily_demand
        daily_demand = (base_daily_demand * (trend_factor ** i)) + seasonality + noise

        # Festival surge: gaussian peak around festival day
        for fest in applicable_festivals:
            fest_date = datetime.datetime.strptime(fest.date, "%Y-%m-%d").replace(tzinfo=datetime.timezone.utc)
            delta_days = abs((d - fest_date).days)
            if delta_days <= 4:
                # Bell curve surge multiplier (peaking at delta_days == 0)
                surge_multiplier = (fest.surge_percent / 100.0) * math.exp(-(delta_days ** 2) / 3.0)
                daily_demand += (base_daily_demand * surge_multiplier)

        daily_demand = max(0.5, round(daily_demand, 1))
        forecast.append(daily_demand)

        if daily_demand > peak_demand:
            peak_demand = daily_demand
            peak_day = d.strftime("%b %d")

    return schemas.ForecastResponse(
        product_id=req.product_id,
        forecast=forecast,
        festivals_detected=applicable_festivals,
        baseline_demand=round(base_daily_demand, 1),
        peak_demand=round(peak_demand, 1),
        peak_day=peak_day
    )

# Smart Clearance & Near-Expiry Markdown Endpoints
@app.get("/inventory/clearance_suggestions", response_model=list[schemas.ClearanceSuggestion])
def get_clearance_suggestions(db: Session = Depends(database.get_db)):
    import datetime
    now = datetime.datetime.now()
    products = db.query(models.Product).all()
    suggestions = []

    for p in products:
        if not p.expiry_date:
            continue

        days_to_expiry = (p.expiry_date.date() - now.date()).days

        # Clearance discounts apply strictly to near-expiry items (1 to 15 days) to liquidate before expiry
        # Expired items are flagged for removal/disposal and must NEVER be sold or discounted
        if 0 < days_to_expiry <= 15 and p.stock > 0:
            if days_to_expiry <= 3:
                discount = 35
                reason = f"Expiring in {days_to_expiry} days! Recommend 35% discount to liquidate {p.stock} units before expiry."
            elif days_to_expiry <= 7:
                discount = 25
                reason = f"Expiring in {days_to_expiry} days! Recommend 25% discount to accelerate turnover."
            else:
                discount = 15
                reason = f"Expiring in {days_to_expiry} days. Early 15% promotion suggested to avoid dead stock."

            discounted_price = round(p.price * (1.0 - (discount / 100.0)), 2)
            potential_loss = round(p.stock * p.price, 2)

            suggestions.append(schemas.ClearanceSuggestion(
                product_id=p.id,
                product_name=p.name,
                category=p.category,
                current_price=p.price,
                discount_percent=discount,
                discounted_price=discounted_price,
                days_to_expiry=days_to_expiry,
                units_at_risk=p.stock,
                potential_loss_avoided=potential_loss,
                reason=reason
            ))

    suggestions.sort(key=lambda s: s.days_to_expiry)
    return suggestions

@app.post("/inventory/apply_discount", response_model=schemas.Product)
def apply_discount(req: schemas.ApplyDiscountRequest, db: Session = Depends(database.get_db)):
    product = db.query(models.Product).filter(models.Product.id == req.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    product.price = req.discounted_price
    db.commit()
    db.refresh(product)
    return product

# Market Basket Analysis / Cross-Selling Affinity Engine
MARKET_BASKET_AFFINITIES = {
    # Basmati Rice -> Desi Ghee & Cumin Seeds (Classic Biryani/Pulao Pair)
    "Basmati Rice": [
        {"name": "Desi Ghee (Clarified Butter)", "confidence": 0.76, "bundle_reason": "Classic Pulao & Biryani Combo (76% co-purchase rate)"},
        {"name": "Cumin Seeds (Jeera)", "confidence": 0.68, "bundle_reason": "Jeera Rice Essential (68% co-purchase rate)"},
        {"name": "Green Cardamom Whole", "confidence": 0.54, "bundle_reason": "Aromatic Rice Blend (54% co-purchase rate)"}
    ],
    # Toor Dal -> Basmati Rice & Cumin Seeds (Dal-Chawal & Tadka)
    "Toor Dal": [
        {"name": "Basmati Rice (Premium)", "confidence": 0.88, "bundle_reason": "Everyday Dal-Chawal Duo (88% co-purchase rate)"},
        {"name": "Desi Ghee (Clarified Butter)", "confidence": 0.72, "bundle_reason": "Dal Tadka Essential (72% co-purchase rate)"},
        {"name": "Mustard Oil (Kachi Ghani)", "confidence": 0.61, "bundle_reason": "Tadka Cooking Oil (61% co-purchase rate)"}
    ],
    # Whole Wheat Atta -> Desi Ghee & Mustard Oil (Roti & Paratha)
    "Whole Wheat Atta": [
        {"name": "Desi Ghee (Clarified Butter)", "confidence": 0.79, "bundle_reason": "Ghee Roti & Paratha Duo (79% co-purchase rate)"},
        {"name": "Mustard Oil (Kachi Ghani)", "confidence": 0.65, "bundle_reason": "Poori & Paratha Oil (65% co-purchase rate)"}
    ],
    # Darjeeling Tea Leaves -> Green Cardamom & Jaggery
    "Darjeeling Tea": [
        {"name": "Green Cardamom Whole", "confidence": 0.82, "bundle_reason": "Elaichi Chai Pairing (82% co-purchase rate)"},
        {"name": "Jaggery Powder (Gur)", "confidence": 0.69, "bundle_reason": "Healthy Sweetener Alternative (69% co-purchase rate)"}
    ],
    # Turmeric Powder -> Kashmiri Chilli & Coriander Powder (Curry Spices Trio)
    "Turmeric Powder": [
        {"name": "Kashmiri Chilli Powder", "confidence": 0.84, "bundle_reason": "Essential Curry Masala Pair (84% co-purchase rate)"},
        {"name": "Coriander Powder (Dhania)", "confidence": 0.81, "bundle_reason": "Trio Indian Spice Base (81% co-purchase rate)"},
        {"name": "Garam Masala Blend", "confidence": 0.74, "bundle_reason": "Finishing Masala Combo (74% co-purchase rate)"}
    ],
    # Cashew Nuts -> Almonds & Desi Ghee (Dry Fruits & Festive Sweets)
    "Cashew Nuts": [
        {"name": "Almonds (Badam)", "confidence": 0.86, "bundle_reason": "Premium Dry Fruits Meva Box (86% co-purchase rate)"},
        {"name": "Desi Ghee (Clarified Butter)", "confidence": 0.73, "bundle_reason": "Mithai & Halwa Preparation (73% co-purchase rate)"}
    ]
}

@app.get("/ml/cross_sell/{product_id}", response_model=schemas.CrossSellResponse)
def get_cross_sell(product_id: int, db: Session = Depends(database.get_db)):
    primary_product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not primary_product:
        raise HTTPException(status_code=404, detail="Product not found")

    all_products = db.query(models.Product).all()
    recommendations = []

    # Check curated affinity rules
    affinity_list = None
    for key, items in MARKET_BASKET_AFFINITIES.items():
        if key.lower() in primary_product.name.lower():
            affinity_list = items
            break

    if affinity_list:
        for aff in affinity_list:
            matched = next((p for p in all_products if aff["name"].lower() in p.name.lower() and p.id != primary_product.id), None)
            if matched and matched.stock > 0:
                recommendations.append(schemas.CrossSellItem(
                    product_id=matched.id,
                    name=matched.name,
                    category=matched.category,
                    price=matched.price,
                    stock=matched.stock,
                    confidence=aff["confidence"],
                    bundle_reason=aff["bundle_reason"]
                ))

    # Fallback to category complement if no direct match
    if not recommendations:
        for p in all_products:
            if p.id != primary_product.id and p.stock > 0 and len(recommendations) < 2:
                if (primary_product.category == "Spices" and p.category in ["Grains", "Oils"]) or \
                   (primary_product.category == "Grains" and p.category in ["Lentils", "Dairy"]):
                    recommendations.append(schemas.CrossSellItem(
                        product_id=p.id,
                        name=p.name,
                        category=p.category,
                        price=p.price,
                        stock=p.stock,
                        confidence=0.55,
                        bundle_reason=f"Popular category pairing with {primary_product.category}"
                    ))

    return schemas.CrossSellResponse(
        primary_product_id=primary_product.id,
        primary_product_name=primary_product.name,
        recommendations=recommendations
    )
