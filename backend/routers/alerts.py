from fastapi import APIRouter, HTTPException, Depends
from auth_utils import get_current_user, require_role
from psycopg2.extras import RealDictCursor
from pydantic import BaseModel
from typing import List, Optional
from database import get_db_connection, release_db_connection

router = APIRouter(prefix="/api/alerts", tags=["Alerts"])

class Alert(BaseModel):
    id: int
    audit_id: int
    type: str
    description: str
    severity: str
    created_at: str
    is_resolved: bool

@router.get("", dependencies=[Depends(require_role("supervisor"))])
def get_alerts(resolved: Optional[bool] = None):
    conn = get_db_connection()
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        query = "SELECT * FROM alerts"
        params = []
        if resolved is not None:
            query += " WHERE is_resolved = %s"
            params.append(resolved)
        query += " ORDER BY created_at DESC"
        cur.execute(query, params)
        alerts = cur.fetchall()
        
        # Convert datetime to string for JSON serialization
        for alert in alerts:
            if alert['created_at']:
                alert['created_at'] = alert['created_at'].isoformat()
        
        cur.close()
        return alerts
    finally:
        release_db_connection(conn)

@router.get("/agent-notifications")
def get_agent_notifications(resolved: Optional[bool] = None, user = Depends(get_current_user)):
    """
    Fetches notifications for the logged-in agent.
    Matches user identity from Supabase metadata (email or name) with audits table.
    """
    conn = get_db_connection()
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # Handle both dict (payload) and User object formats
        if isinstance(user, dict):
            user_email = user.get("email")
            user_name = user.get("user_metadata", {}).get("name")
        else:
            user_email = getattr(user, "email", None)
            user_metadata = getattr(user, "user_metadata", {})
            user_name = user_metadata.get("name") if isinstance(user_metadata, dict) else getattr(user_metadata, "name", None)
        
        # Join alerts -> audits -> agents to filter by agent identity
        query = """
            SELECT al.* 
            FROM alerts al
            JOIN audits au ON al.audit_id = au.id
            JOIN agents ag ON au.agent_id = ag.id
            WHERE (LOWER(ag.email) = LOWER(%s) OR LOWER(ag.name) = LOWER(%s))
        """
        params = [user_email, user_name]
        
        if resolved is not None:
            query += " AND al.is_resolved = %s"
            params.append(resolved)
            
        query += " ORDER BY al.created_at DESC"
        
        cur.execute(query, params)
        alerts = cur.fetchall()
        
        # Convert datetime to string for JSON serialization
        for alert in alerts:
            if alert['created_at']:
                alert['created_at'] = alert['created_at'].isoformat()
        
        cur.close()
        return alerts
    finally:
        release_db_connection(conn)

@router.patch("/{alert_id}/resolve", dependencies=[Depends(require_role("supervisor"))])
def resolve_alert(alert_id: int):
    conn = get_db_connection()
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("UPDATE alerts SET is_resolved = TRUE WHERE id = %s RETURNING id", (alert_id,))
        updated = cur.fetchone()
        conn.commit()
        cur.close()
        if updated:
            return {"success": True}
        raise HTTPException(status_code=404, detail="Alert not found")
    finally:
        release_db_connection(conn)
