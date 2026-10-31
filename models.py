import json
from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Float, Text, Boolean, DateTime, ForeignKey
)
from sqlalchemy.orm import relationship
from database import Base

def utc_now():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), default="customer", nullable=False) # "admin" or "customer"
    created_at = Column(DateTime, default=utc_now)

    orders = relationship("Order", back_populates="user", cascade="all, delete-orphan")


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), index=True, nullable=False)
    description = Column(Text, nullable=False)
    price = Column(Float, nullable=False)
    category = Column(String(100), index=True, nullable=False)
    image_url = Column(String(500), nullable=False)
    stock = Column(Integer, default=0, nullable=False)
    rating = Column(Float, default=4.5)
    num_reviews = Column(Integer, default=0)
    is_featured = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    order_items = relationship("OrderItem", back_populates="product")


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String(64), unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    # Customer Details
    customer_name = Column(String(255), nullable=False)
    customer_email = Column(String(255), nullable=False)
    customer_phone = Column(String(50), nullable=True)
    
    # Shipping Address
    shipping_address = Column(Text, nullable=False)
    city = Column(String(100), nullable=False)
    postal_code = Column(String(50), nullable=False)
    country = Column(String(100), default="USA")
    
    # Payment
    payment_method = Column(String(50), default="card") # "card", "upi", "cod"
    payment_status = Column(String(50), default="completed") # "completed", "pending"
    
    # Pricing Breakdown
    subtotal = Column(Float, nullable=False)
    tax = Column(Float, default=0.0)
    shipping_fee = Column(Float, default=0.0)
    discount = Column(Float, default=0.0)
    total_amount = Column(Float, nullable=False)
    
    # Order Status Lifecycle: Pending -> Processing -> Shipped -> Out for Delivery -> Delivered (or Cancelled)
    status = Column(String(50), default="Pending", nullable=False)
    
    # JSON encoded string of checkpoints: [{ "status": "Pending", "timestamp": "...", "note": "..." }]
    status_history_json = Column(Text, default="[]", nullable=False)
    
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    user = relationship("User", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")

    def get_status_history(self):
        try:
            return json.loads(self.status_history_json or "[]")
        except Exception:
            return []

    def set_status_history(self, history_list):
        self.status_history_json = json.dumps(history_list)


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    product_name = Column(String(255), nullable=False)
    product_image = Column(String(500), nullable=True)
    price = Column(Float, nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    total_price = Column(Float, nullable=False)

    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")
