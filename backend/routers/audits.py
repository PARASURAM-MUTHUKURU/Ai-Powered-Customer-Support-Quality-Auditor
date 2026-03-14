from fastapi import APIRouter, Depends, HTTPException
from auth_utils import get_current_user, require_role
from psycopg2.extras import RealDictCursor
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import json
from database import get_db_connection, release_db_connection

router = APIRouter(prefix="/api/audits", tags=["Audits"], dependencies=[Depends(get_current_user)])

class AuditRequest(BaseModel):
    agent_id: int
    transcript: str
    type: str
    audio_data: Optional[str] = None
    mime_type: Optional[str] = None
    empathy_score: int
    resolution_score: int
    compliance_score: int
    overall_score: int
    violations: List[Dict[str, Any]]
    suggestions: str

@router.get("")
def get_audits():
    conn = get_db_connection()
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        query = """
          SELECT a.*, ag.name as agent_name 
          FROM audits a 
          JOIN agents ag ON a.agent_id = ag.id 
          ORDER BY a.created_at DESC
        """
        cur.execute(query)
        audits = cur.fetchall()
        cur.close()
    finally:
        release_db_connection(conn)
    
    results = []
    for audit in audits:
        audit_dict = dict(audit)
        if isinstance(audit_dict.get("violations"), str):
            try:
                audit_dict["violations"] = json.loads(audit_dict["violations"])
            except:
                audit_dict["violations"] = []
        elif audit_dict.get("violations") is None:
            audit_dict["violations"] = []
        results.append(audit_dict)
        
    return results

@router.post("")
def create_audit(audit: AuditRequest):
    conn = get_db_connection()
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("""
          INSERT INTO audits 
          (agent_id, transcript, type, audio_data, mime_type, empathy_score, 
           resolution_score, compliance_score, overall_score, violations, suggestions)
          VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
          RETURNING id
        """, (
            audit.agent_id, audit.transcript, audit.type, audit.audio_data, audit.mime_type, 
            audit.empathy_score, audit.resolution_score, audit.compliance_score, 
            audit.overall_score, json.dumps(audit.violations), audit.suggestions
        ))
        last_id = cursor.fetchone()['id']
        conn.commit()
        # Alert Triggering Logic
        is_critical = any(v.get('severity') in ['Critical', 'High'] for v in audit.violations)
        is_low_compliance = audit.compliance_score < 70
        
        if is_critical or is_low_compliance:
            alert_type = "Compliance Violation" if is_critical else "Low Compliance Score"
            alert_desc = f"Critical violations detected in audit #{last_id}" if is_critical else f"Audit #{last_id} has a low compliance score of {audit.compliance_score}%"
            alert_severity = "Critical" if (is_critical and any(v.get('severity') == 'Critical' for v in audit.violations)) else "High"
            
            cursor.execute("""
                INSERT INTO alerts (audit_id, type, description, severity)
                VALUES (%s, %s, %s, %s)
            """, (last_id, alert_type, alert_desc, alert_severity))
            conn.commit()

        cursor.close()
        return {"id": last_id}
    finally:
        release_db_connection(conn)

@router.delete("/{audit_id}", dependencies=[Depends(require_role("supervisor"))])
def delete_audit(audit_id: int):
    conn = get_db_connection()
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("DELETE FROM audits WHERE id = %s RETURNING id", (audit_id,))
        deleted = cursor.fetchone()
        conn.commit()
        cursor.close()
        if deleted:
            return {"success": True, "id": deleted['id']}
        return {"success": False, "error": "Audit not found"}
    finally:
        release_db_connection(conn)
