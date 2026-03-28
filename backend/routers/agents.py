from fastapi import APIRouter, Depends, HTTPException
from auth_utils import get_current_user
from psycopg2.extras import RealDictCursor
from database import get_db_connection, release_db_connection

router = APIRouter(prefix="/api/agents", tags=["Agents"], dependencies=[Depends(get_current_user)])

@router.get("")
def get_agents(user = Depends(get_current_user)):
    conn = get_db_connection()
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # Handle both dict (payload) and User object formats
        if isinstance(user, dict):
            user_email = user.get("email")
            user_role = user.get("user_metadata", {}).get("role") or user.get("app_metadata", {}).get("role") or user.get("role")
            user_name = user.get("user_metadata", {}).get("name")
        else:
            user_email = getattr(user, "email", None)
            user_metadata = getattr(user, "user_metadata", {})
            user_role = (user_metadata.get("role") if isinstance(user_metadata, dict) else getattr(user_metadata, "role", None)) or getattr(user, "role", None)
            user_name = user_metadata.get("name") if isinstance(user_metadata, dict) else getattr(user_metadata, "name", None)

        query = "SELECT * FROM agents"
        params = []
        
        # Isolation Logic: Only supervisors see all agents. Others only see themselves.
        if user_role != 'supervisor':
            query += " WHERE (LOWER(email) = LOWER(%s) OR LOWER(name) = LOWER(%s))"
            params = [user_email, user_name]

        cur.execute(query, params)
        agents = cur.fetchall()
        cur.close()
        return agents
    finally:
        release_db_connection(conn)

@router.get("/{agent_id}/analytics")
def get_agent_analytics(agent_id: int, user = Depends(get_current_user)):
    conn = get_db_connection()
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # Handle both dict (payload) and User object formats
        if isinstance(user, dict):
            user_email = user.get("email")
            user_name = user.get("user_metadata", {}).get("name")
            user_role = user.get("user_metadata", {}).get("role") or user.get("role")
        else:
            user_email = getattr(user, "email", None)
            user_metadata = getattr(user, "user_metadata", {})
            user_name = user_metadata.get("name") if isinstance(user_metadata, dict) else getattr(user_metadata, "name", None)
            user_role = (user_metadata.get("role") if isinstance(user_metadata, dict) else getattr(user_metadata, "role", None)) or getattr(user, "role", None)

        # SECURITY: If user is an agent, verify they are requesting their own ID
        if user_role == 'agent':
            cur.execute("SELECT id FROM agents WHERE (LOWER(email) = LOWER(%s) OR LOWER(name) = LOWER(%s))", (user_email, user_name))
            own_id_rec = cur.fetchone()
            if not own_id_rec or own_id_rec['id'] != agent_id:
                raise HTTPException(status_code=403, detail="Not authorized to view other agents' analytics")

        # Get agent's personal trend
        trend_query = """
          SELECT 
            TO_CHAR(created_at, 'YYYY-MM-DD') as date,
            AVG(overall_score) as avg_score,
            AVG(empathy_score) as avg_empathy,
            AVG(resolution_score) as avg_resolution,
            AVG(compliance_score) as avg_compliance
          FROM audits
          WHERE agent_id = %s
          GROUP BY date
          ORDER BY date ASC
          LIMIT 30
        """
        cur.execute(trend_query, (agent_id,))
        trend = cur.fetchall()
        
        # Get agent's recent audits
        recent_query = """
          SELECT id, overall_score, created_at, type
          FROM audits
          WHERE agent_id = %s
          ORDER BY created_at DESC
          LIMIT 5
        """
        cur.execute(recent_query, (agent_id,))
        recent = cur.fetchall()
        
        cur.close()
        
        return {
            "trend": trend,
            "recent_audits": recent
        }
    finally:
        release_db_connection(conn)

