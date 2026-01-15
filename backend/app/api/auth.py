"""Authentication API routes."""

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db import get_db
from app.models.user import User
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, UserResponse
from app.utils.security import get_password_hash, verify_password, create_access_token
from app.utils.dependencies import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse)
async def register(request: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Register a new user."""
    logger.info(f"=== REGISTRATION STARTED ===")
    logger.info(f"Request email: {request.email}")
    logger.info(f"Request full_name: {request.full_name}")
    logger.info(f"Password length: {len(request.password) if request.password else 0}")
    
    try:
        logger.info("Step 1: Checking if user exists...")
        result = await db.execute(select(User).where(User.email == request.email))
        existing_user = result.scalar_one_or_none()
        logger.info(f"User exists check result: {existing_user is not None}")

        if existing_user:
            logger.warning(f"User with email {request.email} already exists")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered"
            )

        logger.info("Step 2: Hashing password...")
        hashed_password = get_password_hash(request.password)
        logger.info(f"Password hashed successfully, hash length: {len(hashed_password)}")

        logger.info("Step 3: Creating user object...")
        new_user = User(
            email=request.email, password_hash=hashed_password, full_name=request.full_name
        )
        logger.info(f"User object created: {new_user.email}")

        logger.info("Step 4: Adding user to database session...")
        db.add(new_user)
        logger.info("User added to session")

        logger.info("Step 5: Committing to database...")
        await db.commit()
        logger.info("Database commit successful")

        logger.info("Step 6: Refreshing user object...")
        await db.refresh(new_user)
        logger.info(f"User refreshed, ID: {new_user.id}")

        logger.info("Step 7: Generating JWT token...")
        access_token = create_access_token(data={"sub": str(new_user.id)})
        logger.info(f"JWT token generated successfully, token length: {len(access_token)}")

        logger.info("=== REGISTRATION SUCCESS ===")
        return TokenResponse(access_token=access_token)
        
    except HTTPException as e:
        logger.error(f"HTTPException raised: {e.status_code} - {e.detail}")
        raise
    except Exception as e:
        logger.error("=== REGISTRATION FAILED ===")
        logger.error(f"Exception type: {type(e).__name__}")
        logger.error(f"Exception message: {str(e)}")
        logger.error(f"Exception args: {e.args}", exc_info=True)
        import traceback
        logger.error(f"Full traceback:\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {type(e).__name__}: {str(e)}"
        )


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Login user and return JWT token."""
    # Find user by email
    result = await db.execute(select(User).where(User.email == request.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Generate JWT token
    access_token = create_access_token(data={"sub": str(user.id)})

    return TokenResponse(access_token=access_token)


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current authenticated user information."""
    return UserResponse(
        id=str(current_user.id),
        email=current_user.email,
        full_name=current_user.full_name,
    )
