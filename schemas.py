from datetime import datetime
from typing import List, Optional, Any
from pydantic import BaseModel, Field

# ----------------- User Schemas -----------------
class UserRegister(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$", description="Valid email address")
    password: str = Field(..., min_length=6)
    role: Optional[str] = "customer" # "customer" or "admin"

class UserLogin(BaseModel):
    email: str = Field(..., pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str

class UserResponse(BaseModel):
    id: int
    full_name: str
    email: str
    role: str
    created_at: datetime

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse



# ----------------- Product Schemas -----------------
class ProductBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    description: str = Field(..., min_length=5)
    price: float = Field(..., gt=0)
    category: str = Field(..., min_length=2, max_length=100)
    image_url: str = Field(..., min_length=5)
    stock: int = Field(default=0, ge=0)
    rating: Optional[float] = 4.5
    num_reviews: Optional[int] = 0
    is_featured: Optional[bool] = False

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = Field(None, gt=0)
    category: Optional[str] = None
    image_url: Optional[str] = None
    stock: Optional[int] = Field(None, ge=0)
    rating: Optional[float] = None
    num_reviews: Optional[int] = None
    is_featured: Optional[bool] = None

class ProductResponse(ProductBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ----------------- Order Item Schemas -----------------
class CartItemInput(BaseModel):
    product_id: int
    quantity: int = Field(..., gt=0)

class OrderItemResponse(BaseModel):
    id: int
    product_id: Optional[int]
    product_name: str
    product_image: Optional[str]
    price: float
    quantity: int
    total_price: float

    class Config:
        from_attributes = True


# ----------------- Order Schemas -----------------
class OrderCreate(BaseModel):
    customer_name: str = Field(..., min_length=2)
    customer_email: str = Field(..., pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    customer_phone: Optional[str] = None
    shipping_address: str = Field(..., min_length=5)
    city: str = Field(..., min_length=2)
    postal_code: str = Field(..., min_length=2)
    country: Optional[str] = "USA"
    payment_method: Optional[str] = "card" # "card", "upi", "cod"
    promo_code: Optional[str] = None
    items: List[CartItemInput] = Field(..., min_length=1)

class StatusHistoryItem(BaseModel):
    status: str
    timestamp: str
    note: Optional[str] = ""

class OrderResponse(BaseModel):
    id: int
    order_number: str
    user_id: Optional[int]
    customer_name: str
    customer_email: str
    customer_phone: Optional[str]
    shipping_address: str
    city: str
    postal_code: str
    country: str
    payment_method: str
    payment_status: str
    subtotal: float
    tax: float
    shipping_fee: float
    discount: float
    total_amount: float
    status: str
    status_history: List[dict] = []
    items: List[OrderItemResponse] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class OrderStatusUpdate(BaseModel):
    status: str = Field(..., description="Pending, Processing, Shipped, Out for Delivery, Delivered, Cancelled")
    note: Optional[str] = None


# ----------------- Admin Stats Schemas -----------------
class AdminStatsResponse(BaseModel):
    total_revenue: float
    total_orders: int
    total_products: int
    total_customers: int
    low_stock_count: int
    recent_orders: List[OrderResponse]
