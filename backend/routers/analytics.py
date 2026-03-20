from fastapi import APIRouter, Depends
from auth_utils import get_current_user
from psycopg2.extras import RealDictCursor
from database import get_db_connection, release_db_connection

router = APIRouter(prefix="/api/analytics", tags=["Analytics"], dependencies=[Depends(get_current_user)])

@router.get("")
def get_analytics(user = Depends(get_current_user)):
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

        # 1. Stats Query
        stats_query = """
          SELECT 
            ag.id as agent_id,
            ag.name as agent_name,
            AVG(a.overall_score) as avg_score,
            AVG(a.empathy_score) as avg_empathy,
            AVG(a.resolution_score) as avg_resolution,
            AVG(a.compliance_score) as avg_compliance,
            COUNT(a.id) as total_audits
          FROM agents ag
          LEFT JOIN audits a ON ag.id = a.agent_id
        """
        stats_params = []
        if user_role == 'agent':
            stats_query += " WHERE (LOWER(ag.email) = LOWER(%s) OR LOWER(ag.name) = LOWER(%s))"
            stats_params = [user_email, user_name]
            
        stats_query += " GROUP BY ag.id, ag.name"
        cur.execute(stats_query, stats_params)
        stats = cur.fetchall()
        
        # 2. Trend Query
        trend_query = """
          SELECT 
            TO_CHAR(a.created_at, 'YYYY-MM-DD') as date,
            AVG(a.overall_score) as avg_score,
            AVG(a.empathy_score) as avg_empathy,
            AVG(a.resolution_score) as avg_resolution,
            AVG(a.compliance_score) as avg_compliance
          FROM audits a
        """
        trend_params = []
        if user_role == 'agent':
            trend_query += " JOIN agents ag ON a.agent_id = ag.id WHERE (LOWER(ag.email) = LOWER(%s) OR LOWER(ag.name) = LOWER(%s))"
            trend_params = [user_email, user_name]
            
        trend_query += " GROUP BY date ORDER BY date ASC LIMIT 30"
        cur.execute(trend_query, trend_params)
        trend = cur.fetchall()
        
        cur.close()
        
        return {
            "stats": stats,
            "trend": trend
        }
    finally:
        release_db_connection(conn)
