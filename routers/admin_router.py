from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from database import get_db
import models
import schemas
from auth import get_current_active_admin
from routers.order_router import format_order_response

router = APIRouter(prefix="/api/admin", tags=["Admin Operations"])

@router.get("/stats")
def get_admin_dashboard_stats(
    admin: models.User = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    """Admin: Overview statistics, sales revenue, inventory alerts, and recent orders."""
    # Total revenue excluding cancelled orders
    revenue = (
        db.query(func.sum(models.Order.total_amount))
        .filter(models.Order.status != "Cancelled")
        .scalar() or 0.0
    )

    total_orders = db.query(func.count(models.Order.id)).scalar() or 0
    total_products = db.query(func.count(models.Product.id)).scalar() or 0
    total_customers = db.query(func.count(models.User.id)).filter(models.User.role == "customer").scalar() or 0

    # Low stock items (stock <= 5)
    low_stock_query = db.query(models.Product).filter(models.Product.stock <= 5)
    low_stock_count = low_stock_query.count()
    low_stock_products = [
        {"id": p.id, "name": p.name, "stock": p.stock, "category": p.category, "price": p.price}
        for p in low_stock_query.all()
    ]

    # Recent 8 orders
    recent_orders = (
        db.query(models.Order)
        .order_by(desc(models.Order.created_at))
        .limit(8)
        .all()
    )

    return {
        "total_revenue": round(revenue, 2),
        "total_orders": total_orders,
        "total_products": total_products,
        "total_customers": total_customers,
        "low_stock_count": low_stock_count,
        "low_stock_products": low_stock_products,
        "recent_orders": [format_order_response(o) for o in recent_orders]
    }
