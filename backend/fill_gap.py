import database
import models
from datetime import datetime, timedelta, timezone, time
import random

def fill_sales_gap():
    db = database.SessionLocal()
    products = db.query(models.Product).all()
    if not products:
        print("No products found in DB!")
        return

    # Check latest sale in DB
    latest_sale = db.query(models.Sale).order_by(models.Sale.timestamp.desc()).first()
    start_date = latest_sale.timestamp.date() + timedelta(days=1) if latest_sale else datetime(2026, 10, 5).date()
    end_date = datetime(2026, 11, 1).date()

    print(f"Generating sales from {start_date} to {end_date}...")

    # Weight staples higher
    weights = []
    for p in products:
        if p.category in ["Grains", "Lentils", "Spices"] and p.price < 300:
            weights.append(10)
        elif p.category in ["Dairy", "Beverages", "Oils"]:
            weights.append(6)
        else:
            weights.append(3)

    total_added = 0
    curr_date = start_date
    day_count = 0

    while curr_date <= end_date:
        # Weekend bonus (Saturday=5, Sunday=6)
        is_weekend = curr_date.weekday() in [5, 6]
        base_txn_count = random.randint(14, 20) if is_weekend else random.randint(10, 15)
        
        # Gentle growth factor over time
        growth = 1.0 + (day_count * 0.008)
        num_sales = int(base_txn_count * growth)

        for _ in range(num_sales):
            p = random.choices(products, weights=weights)[0]
            # Quantities: grains/lentils tend to sell in 2-5 units, spices 1-3, cardamom/dry fruits 1-2
            if p.category in ["Grains", "Lentils"]:
                q = random.randint(2, 6)
            elif p.price > 500:
                q = random.randint(1, 2)
            else:
                q = random.randint(1, 4)

            # Random time between 08:30 and 20:45
            hour = random.randint(8, 20)
            minute = random.randint(0, 59)
            second = random.randint(0, 59)

            sale_time = datetime.combine(curr_date, time(hour, minute, second))

            sale = models.Sale(
                product_id=p.id,
                quantity=q,
                total_price=round(p.price * q, 2),
                timestamp=sale_time
            )
            db.add(sale)
            total_added += 1

        curr_date += timedelta(days=1)
        day_count += 1

    # Also update product expiry dates relative to Nov 1, 2026 so alerts are fresh
    now_nov = datetime(2026, 11, 1, 14, 0, 0)
    for p in products:
        if "Coconut Oil" in p.name:
            p.expiry_date = now_nov - timedelta(days=5) # Expired
        elif "Desi Ghee" in p.name:
            p.expiry_date = now_nov - timedelta(days=2) # Expired
        elif "Cashew" in p.name:
            p.expiry_date = now_nov - timedelta(days=1) # Expired
        elif "Tea Leaves" in p.name:
            p.expiry_date = now_nov + timedelta(days=12) # Expiring soon
        elif p.expiry_date and p.expiry_date < now_nov:
            p.expiry_date = now_nov + timedelta(days=120)

    db.commit()
    print(f"Successfully added {total_added} sales transactions across {day_count} days!")
    db.close()

if __name__ == "__main__":
    fill_sales_gap()
