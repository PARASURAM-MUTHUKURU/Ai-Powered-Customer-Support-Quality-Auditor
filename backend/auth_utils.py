import os
import logging
from typing import Optional
from fastapi import HTTPException, Depends, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()
load_dotenv(".env.local")

# Configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")

# Initialize Supabase client for online verification (fallback)
supabase: Optional[Client] = None
if SUPABASE_URL and SUPABASE_ANON_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)):
    """
    Verifies the Supabase JWT and returns the user information.
    Supports both HS256 (Legacy) and ES256 (New ECC standard) algorithms.
    """
    token = credentials.credentials
    
    # 1. Local verification (Fastest & Preferred)
    if SUPABASE_JWT_SECRET:
        try:
            # First, try to peek at the header to determine the algorithm
            # python-jose's jwt.get_unverified_header is useful here
            from jose import jwt as jose_jwt
            header = jose_jwt.get_unverified_header(token)
            alg = header.get("alg", "HS256")
            
            # Supabase tokens are signed with the JWT Secret
            # Note: For ES256, Supabase typically uses a public key, but if they provide 
            # a 'JWT Secret' for HS256 fallback, we use that. 
            # If the alg is ES256, we try to decode it.
            payload = jwt.decode(
                token, 
                SUPABASE_JWT_SECRET, 
                algorithms=["HS256", "ES256"], 
                options={"verify_aud": False}
            )
            return payload
        except JWTError as e:
            # Log the specific error for debugging
            logger = logging.getLogger("auth")
            logger.warning(f"Local JWT verification failed: {str(e)}")
            # Fall through to online verification if enabled
    
    # 2. Online verification (Fallback if Secret fails or is missing)
    if supabase:
        try:
            # This calls the Supabase Auth API to verify the token
            # This is robust against algorithm changes as Supabase manages the keys
            user_response = supabase.auth.get_user(token)
            if user_response and user_response.user:
                return user_response.user
            else:
                raise HTTPException(status_code=401, detail="User not found or session expired")
        except Exception as e:
            # Check for common "session_not_found" or 403 errors
            error_msg = str(e)
            if "session_not_found" in error_msg or "403" in error_msg:
                raise HTTPException(
                    status_code=401, 
                    detail="Auth session not found or expired. Please logout and login again."
                )
            raise HTTPException(status_code=401, detail=f"Authentication failed: {error_msg}")
            
    # If neither method is available
    raise HTTPException(
        status_code=500, 
        detail="Authentication configuration missing on server (SUPABASE_JWT_SECRET or SUPABASE_URL/KEY)"
    )

def require_role(role: str):
    """
    Dependency to restrict access based on user role in metadata.
    """
    async def role_checker(user = Depends(get_current_user)):
        # Supabase stores roles in user_metadata or app_metadata
        # Generic role (like 'authenticated') is often at the top level, 
        # so we prioritize custom roles in metadata.
        user_metadata = {}
        app_metadata = {}
        
        if isinstance(user, dict):
            user_metadata = user.get("user_metadata", {})
            app_metadata = user.get("app_metadata", {})
            # Prioritize metadata roles
            user_role = user_metadata.get("role") or app_metadata.get("role") or user.get("role")
        else:
            # Handle User object
            user_metadata = getattr(user, "user_metadata", {})
            app_metadata = getattr(user, "app_metadata", {})
            
            # Metadata might be an object or a dict
            meta_role = None
            if isinstance(user_metadata, dict):
                meta_role = user_metadata.get("role")
            else:
                meta_role = getattr(user_metadata, "role", None)
                
            if not meta_role:
                if isinstance(app_metadata, dict):
                    meta_role = app_metadata.get("role")
                else:
                    meta_role = getattr(app_metadata, "role", None)
            
            user_role = meta_role or getattr(user, "role", None)
        
        print(f"DEBUG: Auth Role Check - Expected: {role}, Detected: {user_role}")
        if user_role != role:
            print(f"DEBUG: Access denied. User: {user_metadata.get('email', 'unknown')}")
            raise HTTPException(status_code=403, detail=f"Requires {role} role (Detected: {user_role})")
        
        print(f"DEBUG: Access granted for {role}")
        return user
    return role_checker
