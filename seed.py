from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from database import SessionLocal, Base, engine
import models
from auth import hash_password

def seed_database(db: Session = None):
    should_close = False
    if db is None:
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        should_close = True

    try:
        # Check if users already exist
        admin = db.query(models.User).filter_by(email="admin@store.com").first()
        if not admin:
            admin = models.User(
                full_name="Alex Rivera (Store Admin)",
                email="admin@store.com",
                hashed_password=hash_password("admin123"),
                role="admin"
            )
            db.add(admin)

        customer = db.query(models.User).filter_by(email="user@store.com").first()
        if not customer:
            customer = models.User(
                full_name="Sarah Jenkins",
                email="user@store.com",
                hashed_password=hash_password("user123"),
                role="customer"
            )
            db.add(customer)

        db.commit()
        db.refresh(admin)
        db.refresh(customer)

        # Check if products already exist
        if db.query(models.Product).count() == 0:
            sample_products = [
                {
                    "name": "Apple MacBook Pro 16\" M3 Max",
                    "description": "Supercharged with the M3 Max chip. 36GB unified memory, 1TB SSD storage, stunning Liquid Retina XDR display, up to 22 hours of battery life.",
                    "price": 2499.00,
                    "category": "Electronics",
                    "image_url": "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80",
                    "stock": 14,
                    "rating": 4.9,
                    "num_reviews": 128,
                    "is_featured": True
                },
                {
                    "name": "Sony WH-1000XM5 Wireless Headphones",
                    "description": "Industry-leading noise canceling with two processors and 8 microphones. Magnificent sound quality, ultra-comfortable lightweight design with 30-hour battery life.",
                    "price": 349.99,
                    "category": "Audio",
                    "image_url": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80",
                    "stock": 25,
                    "rating": 4.8,
                    "num_reviews": 94,
                    "is_featured": True
                },
                {
                    "name": "Fujifilm X-T5 Mirrorless Camera",
                    "description": "Fifth-generation X-Trans CMOS 5 HR sensor with 40.2 megapixels. Compact, lightweight body, 5-axis in-body image stabilization, and iconic retro dial controls.",
                    "price": 1699.00,
                    "category": "Photography",
                    "image_url": "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80",
                    "stock": 8,
                    "rating": 4.9,
                    "num_reviews": 47,
                    "is_featured": True
                },
                {
                    "name": "Apple Watch Ultra 2 Titanium",
                    "description": "The most rugged and capable Apple Watch. 49mm titanium case, precision dual-frequency GPS, customizable Action button, and up to 36 hours of battery life.",
                    "price": 799.00,
                    "category": "Wearables",
                    "image_url": "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80",
                    "stock": 18,
                    "rating": 4.8,
                    "num_reviews": 65,
                    "is_featured": True
                },
                {
                    "name": "Premium Full-Grain Leather Backpack",
                    "description": "Handcrafted from durable vegetable-tanned Italian leather. Fits 16\" laptops, waterproof YKK zippers, breathable mesh back panel, and lifetime warranty.",
                    "price": 189.50,
                    "category": "Apparel",
                    "image_url": "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80",
                    "stock": 30,
                    "rating": 4.7,
                    "num_reviews": 82,
                    "is_featured": False
                },
                {
                    "name": "Keychron Q1 Pro Wireless Mechanical Keyboard",
                    "description": "75% layout all-metal custom mechanical keyboard. QMK/VIA programmable, hot-swappable switches, double-gasket mount design with Bluetooth 5.1 & Type-C.",
                    "price": 199.00,
                    "category": "Electronics",
                    "image_url": "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80",
                    "stock": 4, # Low stock trigger for admin!
                    "rating": 4.8,
                    "num_reviews": 53,
                    "is_featured": False
                },
                {
                    "name": "Ergonomic Mesh Task Chair Pro",
                    "description": "Engineered for 12+ hour comfort. Dynamic lumbar support, 4D adjustable armrests, breathable Korean mesh, and synchronous tilt mechanism.",
                    "price": 429.00,
                    "category": "Home & Living",
                    "image_url": "https://images.unsplash.com/photo-1580481077195-c22ae2499d0e?auto=format&fit=crop&w=800&q=80",
                    "stock": 12,
                    "rating": 4.6,
                    "num_reviews": 38,
                    "is_featured": False
                },
                {
                    "name": "Minimalist Matte Pour-Over Kettle & Brewer",
                    "description": "Precision gooseneck spout for optimal pour-over flow rate. Built-in analog thermometer, ergonomic counterbalanced handle, compatible with all stovetops.",
                    "price": 75.00,
                    "category": "Home & Living",
                    "image_url": "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80",
                    "stock": 40,
                    "rating": 4.7,
                    "num_reviews": 112,
                    "is_featured": False
                },
                {
                    "name": "Bose SoundLink Flex Bluetooth Speaker",
                    "description": "Astonishing sound wherever life takes you. PositionIQ technology detects orientation, IP67 waterproof & dustproof, resistant to drops and rust.",
                    "price": 149.00,
                    "category": "Audio",
                    "image_url": "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=800&q=80",
                    "stock": 3, # Low stock trigger
                    "rating": 4.8,
                    "num_reviews": 76,
                    "is_featured": True
                },
                {
                    "name": "Polarized Aviator Sunglasses (Titanium Edition)",
                    "description": "Ultra-lightweight aerospace-grade titanium frame with polarized gradient lenses. 100% UV400 protection, anti-reflective coating, and luxury leather case.",
                    "price": 125.00,
                    "category": "Apparel",
                    "image_url": "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=800&q=80",
                    "stock": 22,
                    "rating": 4.5,
                    "num_reviews": 41,
                    "is_featured": False
                }
            ]

            for p_data in sample_products:
                prod = models.Product(**p_data)
                db.add(prod)
            db.commit()

        # Seed a sample order for demonstration if no orders exist
        if db.query(models.Order).count() == 0 and customer:
            p1 = db.query(models.Product).filter_by(name="Sony WH-1000XM5 Wireless Headphones").first()
            p2 = db.query(models.Product).filter_by(name="Apple Watch Ultra 2 Titanium").first()
            
            if p1 and p2:
                now = datetime.now(timezone.utc)
                sample_order = models.Order(
                    order_number="ORD-2026-9810",
                    user_id=customer.id,
                    customer_name=customer.full_name,
                    customer_email=customer.email,
                    customer_phone="+1 (555) 234-5678",
                    shipping_address="742 Evergreen Terrace",
                    city="Springfield",
                    postal_code="97477",
                    country="USA",
                    payment_method="card",
                    payment_status="completed",
                    subtotal=1148.99,
                    tax=57.45,
                    shipping_fee=0.0,
                    discount=0.0,
                    total_amount=1206.44,
                    status="Shipped",
                    created_at=now - timedelta(days=2)
                )
                sample_order.set_status_history([
                    {
                        "status": "Pending",
                        "timestamp": (now - timedelta(days=2)).strftime("%b %d, %Y %I:%M %p"),
                        "note": "Order placed successfully."
                    },
                    {
                        "status": "Processing",
                        "timestamp": (now - timedelta(days=1, hours=18)).strftime("%b %d, %Y %I:%M %p"),
                        "note": "Payment verified and items packed in warehouse."
                    },
                    {
                        "status": "Shipped",
                        "timestamp": (now - timedelta(hours=12)).strftime("%b %d, %Y %I:%M %p"),
                        "note": "Handed over to carrier. Tracking: FEDEX-94829104"
                    }
                ])
                db.add(sample_order)
                db.flush()

                item1 = models.OrderItem(
                    order_id=sample_order.id,
                    product_id=p1.id,
                    product_name=p1.name,
                    product_image=p1.image_url,
                    price=p1.price,
                    quantity=1,
                    total_price=p1.price
                )
                item2 = models.OrderItem(
                    order_id=sample_order.id,
                    product_id=p2.id,
                    product_name=p2.name,
                    product_image=p2.image_url,
                    price=p2.price,
                    quantity=1,
                    total_price=p2.price
                )
                db.add_all([item1, item2])
                db.commit()

        print("Database seeded successfully with initial users, products, and sample order.")
    finally:
        if should_close:
            db.close()

if __name__ == "__main__":
    seed_database()
