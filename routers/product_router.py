from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, asc
from database import get_db
import models
import schemas
from auth import get_current_active_admin

router = APIRouter(prefix="/api/products", tags=["Products"])

@router.get("", response_model=List[schemas.ProductResponse])
def get_products(
    category: Optional[str] = Query(None, description="Filter by product category"),
    search: Optional[str] = Query(None, description="Search by title or description"),
    min_price: Optional[float] = Query(None, ge=0),
    max_price: Optional[float] = Query(None, ge=0),
    in_stock_only: Optional[bool] = Query(False),
    sort_by: Optional[str] = Query("featured", description="featured, price_asc, price_desc, rating, newest"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Retrieve catalog products with comprehensive filtering, search, and sorting."""
    query = db.query(models.Product)

    if category and category.lower() != "all":
        query = query.filter(func.lower(models.Product.category) == category.lower())

    if search:
        search_filter = f"%{search.strip().lower()}%"
        query = query.filter(
            func.lower(models.Product.name).like(search_filter) |
            func.lower(models.Product.description).like(search_filter)
        )

    if min_price is not None:
        query = query.filter(models.Product.price >= min_price)

    if max_price is not None:
        query = query.filter(models.Product.price <= max_price)

    if in_stock_only:
        query = query.filter(models.Product.stock > 0)

    # Sorting
    if sort_by == "price_asc":
        query = query.order_by(asc(models.Product.price))
    elif sort_by == "price_desc":
        query = query.order_by(desc(models.Product.price))
    elif sort_by == "rating":
        query = query.order_by(desc(models.Product.rating))
    elif sort_by == "newest":
        query = query.order_by(desc(models.Product.created_at))
    else: # featured default
        query = query.order_by(desc(models.Product.is_featured), desc(models.Product.id))

    return query.offset(offset).limit(limit).all()


@router.get("/categories")
def get_categories(db: Session = Depends(get_db)):
    """Get all distinct product categories with their respective product counts."""
    results = (
        db.query(models.Product.category, func.count(models.Product.id))
        .group_by(models.Product.category)
        .order_by(models.Product.category)
        .all()
    )
    total_count = db.query(func.count(models.Product.id)).scalar()
    categories = [{"name": "All", "count": total_count}]
    for name, count in results:
        categories.append({"name": name, "count": count})
    return categories


@router.get("/{product_id}", response_model=schemas.ProductResponse)
def get_product_by_id(product_id: int, db: Session = Depends(get_db)):
    """Retrieve details for a single product by ID."""
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product


# Admin-Protected Endpoints
@router.post("", response_model=schemas.ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    product_in: schemas.ProductCreate,
    admin: models.User = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    """Admin: Add a new product to the catalog."""
    product = models.Product(**product_in.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.put("/{product_id}", response_model=schemas.ProductResponse)
def update_product(
    product_id: int,
    product_in: schemas.ProductUpdate,
    admin: models.User = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    """Admin: Update an existing product's details or inventory."""
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    update_data = product_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(product, field, value)

    db.commit()
    db.refresh(product)
    return product


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: int,
    admin: models.User = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    """Admin: Remove a product from the catalog."""
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    db.delete(product)
    db.commit()
    return None
