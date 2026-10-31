from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from auth import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register", response_model=schemas.TokenResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: schemas.UserRegister, db: Session = Depends(get_db)):
    """Register a new customer (or admin if specified during setup)."""
    existing_user = db.query(models.User).filter(models.User.email == user_in.email.lower()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )

    # Normalize role
    role = "admin" if user_in.role and user_in.role.lower() == "admin" else "customer"

    new_user = models.User(
        full_name=user_in.full_name.strip(),
        email=user_in.email.lower(),
        hashed_password=hash_password(user_in.password),
        role=role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token(data={"sub": str(new_user.id), "role": new_user.role, "email": new_user.email})

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": new_user
    }


@router.post("/login", response_model=schemas.TokenResponse)
def login(login_data: schemas.UserLogin, db: Session = Depends(get_db)):
    """Authenticate with email and password to receive a JWT access token."""
    user = db.query(models.User).filter(models.User.email == login_data.email.lower()).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    token = create_access_token(data={"sub": str(user.id), "role": user.role, "email": user.email})

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }


@router.get("/me", response_model=schemas.UserResponse)
def get_current_user_profile(current_user: models.User = Depends(get_current_user)):
    """Get the profile of the currently logged-in user."""
    return current_user
