import random
import string
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from database import get_db
import models
import schemas
from auth import get_current_user, get_optional_current_user, get_current_active_admin
from config import settings

router = APIRouter(prefix="/api/orders", tags=["Orders"])

def generate_order_number() -> str:
    """Generates an order tracking reference like ORD-2026-8742."""
    year = datetime.now().year
    random_digits = "".join(random.choices(string.digits, k=5))
    return f"ORD-{year}-{random_digits}"

def format_order_response(order: models.Order) -> dict:
    """Helper to convert Order ORM instance into response schema dictionary."""
    return {
        "id": order.id,
        "order_number": order.order_number,
        "user_id": order.user_id,
        "customer_name": order.customer_name,
        "customer_email": order.customer_email,
        "customer_phone": order.customer_phone,
        "shipping_address": order.shipping_address,
        "city": order.city,
        "postal_code": order.postal_code,
        "country": order.country,
        "payment_method": order.payment_method,
        "payment_status": order.payment_status,
        "subtotal": round(order.subtotal, 2),
        "tax": round(order.tax, 2),
        "shipping_fee": round(order.shipping_fee, 2),
        "discount": round(order.discount, 2),
        "total_amount": round(order.total_amount, 2),
        "status": order.status,
        "status_history": order.get_status_history(),
        "items": [
            {
                "id": item.id,
                "product_id": item.product_id,
                "product_name": item.product_name,
                "product_image": item.product_image,
                "price": round(item.price, 2),
                "quantity": item.quantity,
                "total_price": round(item.total_price, 2),
            }
            for item in order.items
        ],
        "created_at": order.created_at,
        "updated_at": order.updated_at
    }


@router.post("", response_model=schemas.OrderResponse, status_code=status.HTTP_201_CREATED)
def create_order(
    order_in: schemas.OrderCreate,
    current_user: Optional[models.User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    """
    Checkout API: Validates stock, deducts inventory, calculates totals,
    generates tracking reference, and persists the order.
    """
    if not order_in.items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cart is empty.")

    # 1. Validate items and verify inventory
    subtotal = 0.0
    items_to_create = []

    for item_input in order_in.items:
        product = db.query(models.Product).filter(models.Product.id == item_input.product_id).first()
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product with ID {item_input.product_id} no longer exists."
            )
        if product.stock < item_input.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient stock for '{product.name}'. Available: {product.stock}, Requested: {item_input.quantity}"
            )

        item_total = product.price * item_input.quantity
        subtotal += item_total

        # Prepare order item
        items_to_create.append({
            "product": product,
            "product_id": product.id,
            "product_name": product.name,
            "product_image": product.image_url,
            "price": product.price,
            "quantity": item_input.quantity,
            "total_price": item_total
        })

    # 2. Calculate discounts, taxes, and shipping
    discount = 0.0
    if order_in.promo_code:
        code = order_in.promo_code.strip().upper()
        if code in ["SAVE10", "WELCOME10"]:
            discount = subtotal * 0.10
        elif code in ["SAVE20", "SUPER20"]:
            discount = subtotal * 0.20
        elif code == "FREESHIP":
            discount = 0.0 # Will wipe shipping fee below

    taxable_amount = max(0.0, subtotal - discount)
    tax = taxable_amount * settings.TAX_RATE

    if subtotal >= settings.FREE_SHIPPING_THRESHOLD or (order_in.promo_code and order_in.promo_code.upper() == "FREESHIP"):
        shipping_fee = 0.0
    else:
        shipping_fee = settings.STANDARD_SHIPPING_FEE

    total_amount = max(0.0, taxable_amount + tax + shipping_fee)

    # 3. Deduct stock
    for item_data in items_to_create:
        item_data["product"].stock -= item_data["quantity"]

    # 4. Generate order
    now = datetime.now(timezone.utc)
    order_num = generate_order_number()

    # Link user id if user is logged in
    user_id = current_user.id if current_user else None

    new_order = models.Order(
        order_number=order_num,
        user_id=user_id,
        customer_name=order_in.customer_name.strip(),
        customer_email=order_in.customer_email.strip(),
        customer_phone=order_in.customer_phone.strip() if order_in.customer_phone else None,
        shipping_address=order_in.shipping_address.strip(),
        city=order_in.city.strip(),
        postal_code=order_in.postal_code.strip(),
        country=order_in.country or "USA",
        payment_method=order_in.payment_method or "card",
        payment_status="completed" if order_in.payment_method != "cod" else "pending",
        subtotal=subtotal,
        tax=tax,
        shipping_fee=shipping_fee,
        discount=discount,
        total_amount=total_amount,
        status="Pending",
        created_at=now,
        updated_at=now
    )

    # Initialize tracking history
    initial_history = [
        {
            "status": "Pending",
            "timestamp": now.strftime("%b %d, %Y %I:%M %p"),
            "note": "Order received and queued for processing."
        }
    ]
    new_order.set_status_history(initial_history)
    db.add(new_order)
    db.flush() # Populate new_order.id

    # Create order item records
    for item_data in items_to_create:
        order_item = models.OrderItem(
            order_id=new_order.id,
            product_id=item_data["product_id"],
            product_name=item_data["product_name"],
            product_image=item_data["product_image"],
            price=item_data["price"],
            quantity=item_data["quantity"],
            total_price=item_data["total_price"]
        )
        db.add(order_item)

    db.commit()
    db.refresh(new_order)

    return format_order_response(new_order)


@router.get("/track/{order_ref}", response_model=schemas.OrderResponse)
def track_order(order_ref: str, db: Session = Depends(get_db)):
    """
    Public Order Tracking: Look up an order by order number (e.g. ORD-2026-9810)
    or internal order ID. Returns milestone tracking progress and details.
    """
    order = db.query(models.Order).filter(
        (models.Order.order_number == order_ref.strip()) |
        (models.Order.id == (int(order_ref) if order_ref.isdigit() else -1))
    ).first()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order '{order_ref}' not found. Please verify your order number."
        )

    return format_order_response(order)


@router.get("/my-orders", response_model=List[schemas.OrderResponse])
def get_my_orders(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve all past orders placed by the currently logged-in user."""
    orders = (
        db.query(models.Order)
        .filter(models.Order.user_id == current_user.id)
        .order_by(desc(models.Order.created_at))
        .all()
    )
    return [format_order_response(o) for o in orders]


# Admin Protected Endpoints
@router.get("", response_model=List[schemas.OrderResponse])
def get_all_orders(
    status_filter: Optional[str] = Query(None, description="Filter orders by status"),
    admin: models.User = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    """Admin: Retrieve all customer orders with optional status filter."""
    query = db.query(models.Order)
    if status_filter and status_filter.lower() != "all":
        query = query.filter(models.Order.status == status_filter)

    orders = query.order_by(desc(models.Order.created_at)).all()
    return [format_order_response(o) for o in orders]


@router.get("/{order_id}", response_model=schemas.OrderResponse)
def get_order_details(
    order_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get order details by ID. Customers can only view their own; Admins can view any."""
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    if current_user.role != "admin" and order.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    return format_order_response(order)


@router.put("/{order_id}/status", response_model=schemas.OrderResponse)
def update_order_status(
    order_id: int,
    status_update: schemas.OrderStatusUpdate,
    admin: models.User = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    """Admin: Update an order's status and add a timestamped timeline checkpoint."""
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    valid_statuses = ["Pending", "Processing", "Shipped", "Out for Delivery", "Delivered", "Cancelled"]
    new_status = status_update.status.strip()
    if new_status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status '{new_status}'. Allowed: {', '.join(valid_statuses)}"
        )

    order.status = new_status
    if new_status == "Delivered":
        order.payment_status = "completed"

    # Append to status history
    now = datetime.now(timezone.utc)
    history = order.get_status_history()
    note = status_update.note or f"Status changed to {new_status}."
    history.append({
        "status": new_status,
        "timestamp": now.strftime("%b %d, %Y %I:%M %p"),
        "note": note
    })
    order.set_status_history(history)
    order.updated_at = now

    db.commit()
    db.refresh(order)

    return format_order_response(order)
