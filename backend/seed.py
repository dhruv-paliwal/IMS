import database
import models
from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone
import random

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

def seed_db():
    database.Base.metadata.create_all(bind=database.engine)
    db = database.SessionLocal()

    # Clear all data first for a fresh start
    db.query(models.Sale).delete()
    db.query(models.Product).delete()
    db.query(models.User).delete()
    db.commit()

    print("Seeding users...")
    user = models.User(username="admin", hashed_password=get_password_hash("password"))
    db.add(user)
    db.commit()

    print("Seeding products...")
    now = datetime.now(timezone.utc)
    
    product_data = [
        {"name": "Turmeric Powder (Organic)", "sku": "SP-TUR-01", "category": "Spices", "price": 120.0, "stock": 45, "supplier": "Kerala Spices Co.", "expiry_date": now + timedelta(days=180)},
        {"name": "Basmati Rice (Premium)", "sku": "GR-BAS-02", "category": "Grains", "price": 250.0, "stock": 120, "supplier": "Punjab Agro", "expiry_date": now + timedelta(days=365)},
        {"name": "Kashmiri Chilli Powder", "sku": "SP-CHI-03", "category": "Spices", "price": 180.0, "stock": 5, "supplier": "Kerala Spices Co.", "expiry_date": now + timedelta(days=90)},
        {"name": "Cold Pressed Coconut Oil", "sku": "OI-COC-04", "category": "Oils", "price": 450.0, "stock": 25, "supplier": "Malabar Naturals", "expiry_date": now - timedelta(days=10)}, # Expired
        {"name": "Darjeeling Tea Leaves", "sku": "BE-TEA-05", "category": "Beverages", "price": 300.0, "stock": 8, "supplier": "Assam Tea Estates", "expiry_date": now + timedelta(days=15)},
        {"name": "Green Cardamom Whole", "sku": "SP-CAR-06", "category": "Spices", "price": 1200.0, "stock": 2, "supplier": "Kerala Spices Co.", "expiry_date": now + timedelta(days=120)}, # Very low stock
        {"name": "Toor Dal (Pigeon Pea)", "sku": "LE-TOO-07", "category": "Lentils", "price": 160.0, "stock": 200, "supplier": "Deccan Farms", "expiry_date": now + timedelta(days=200)},
        {"name": "Mustard Oil (Kachi Ghani)", "sku": "OI-MUS-08", "category": "Oils", "price": 190.0, "stock": 4, "supplier": "Rajasthan Mills", "expiry_date": now + timedelta(days=180)},
        {"name": "Cumin Seeds (Jeera)", "sku": "SP-CUM-09", "category": "Spices", "price": 280.0, "stock": 60, "supplier": "Gujarat Traders", "expiry_date": now + timedelta(days=150)},
        {"name": "Garam Masala Blend", "sku": "SP-GAR-10", "category": "Spices", "price": 220.0, "stock": 1, "supplier": "Delhi Spices", "expiry_date": now + timedelta(days=100)}, # Critical stock
        {"name": "Desi Ghee (Clarified Butter)", "sku": "DA-GHE-11", "category": "Dairy", "price": 550.0, "stock": 35, "supplier": "Haryana Dairy", "expiry_date": now - timedelta(days=2)}, # Expired
        {"name": "Whole Wheat Atta", "sku": "GR-WHE-12", "category": "Grains", "price": 220.0, "stock": 300, "supplier": "Punjab Agro", "expiry_date": now + timedelta(days=90)},
        {"name": "Brown Chickpeas (Kala Chana)", "sku": "LE-CHI-13", "category": "Lentils", "price": 110.0, "stock": 9, "supplier": "Deccan Farms", "expiry_date": now + timedelta(days=250)},
        {"name": "Coriander Powder (Dhania)", "sku": "SP-COR-14", "category": "Spices", "price": 140.0, "stock": 55, "supplier": "Gujarat Traders", "expiry_date": now + timedelta(days=160)},
        {"name": "Filter Coffee Powder", "sku": "BE-COF-15", "category": "Beverages", "price": 350.0, "stock": 7, "supplier": "Coorg Plantations", "expiry_date": now + timedelta(days=80)},
        {"name": "Himalayan Pink Salt", "sku": "SP-SAL-16", "category": "Spices", "price": 120.0, "stock": 80, "supplier": "Mountain Naturals", "expiry_date": now + timedelta(days=500)},
        {"name": "Jaggery Powder (Gur)", "sku": "SW-JAG-17", "category": "Sweeteners", "price": 90.0, "stock": 0, "supplier": "UP Sugars", "expiry_date": now + timedelta(days=120)}, # Out of stock
        {"name": "Poha (Flattened Rice)", "sku": "GR-POH-18", "category": "Grains", "price": 60.0, "stock": 150, "supplier": "MP Agro", "expiry_date": now + timedelta(days=140)},
        {"name": "Cashew Nuts (Kaju)", "sku": "DF-CAS-19", "category": "Dry Fruits", "price": 850.0, "stock": 15, "supplier": "Goa Cashews", "expiry_date": now - timedelta(days=5)}, # Expired
        {"name": "Almonds (Badam)", "sku": "DF-ALM-20", "category": "Dry Fruits", "price": 750.0, "stock": 3, "supplier": "Kashmir Orchards", "expiry_date": now + timedelta(days=200)},
    ]
    
    db_products = []
    for p in product_data:
        prod = models.Product(**p)
        db.add(prod)
        db_products.append(prod)
    db.commit()

    print("Seeding robust sales data across the last 30 days...")
    # Generate ~450 sales over the last 30 days with weekend boosts and growth
    weights = []
    for p in db_products:
        if p.category in ["Grains", "Lentils", "Spices"] and p.price < 300:
            weights.append(10)
        elif p.category in ["Dairy", "Beverages", "Oils"]:
            weights.append(6)
        else:
            weights.append(3)

    for days_ago in range(30, -1, -1):
        target_date = now - timedelta(days=days_ago)
        is_weekend = target_date.weekday() in [5, 6]
        base_txn = random.randint(14, 20) if is_weekend else random.randint(10, 15)
        growth = 1.0 + ((30 - days_ago) * 0.008)
        num_sales = int(base_txn * growth)

        for _ in range(num_sales):
            p = random.choices(db_products, weights=weights)[0]
            if p.category in ["Grains", "Lentils"]:
                q = random.randint(2, 6)
            elif p.price > 500:
                q = random.randint(1, 2)
            else:
                q = random.randint(1, 4)

            hour = random.randint(8, 20)
            minute = random.randint(0, 59)
            second = random.randint(0, 59)
            sale_time = target_date.replace(hour=hour, minute=minute, second=second)

            sale = models.Sale(
                product_id=p.id,
                quantity=q,
                total_price=round(p.price * q, 2),
                timestamp=sale_time
            )
            db.add(sale)

    db.commit()
    db.close()
    print("Database seeded with 30-day continuous sales!")

if __name__ == "__main__":
    seed_db()
