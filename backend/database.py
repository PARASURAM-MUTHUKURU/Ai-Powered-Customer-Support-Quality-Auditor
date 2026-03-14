import os
import psycopg2
from psycopg2.pool import ThreadedConnectionPool
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
# In production, these are usually provided by the container environment.
# Locally, we use .env.local or .env.
load_dotenv() # Searches for .env by default
load_dotenv(".env.local") # Fallback to .env.local if present

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL:
    DATABASE_URL = DATABASE_URL.strip().strip("'").strip('"')

# Initialize connection pool
# minconn=1, maxconn=20 gives us a good balance for a standard web app
db_pool = ThreadedConnectionPool(1, 20, DATABASE_URL)

def get_db_connection():
    """Returns a new psycopg2 connection from the pool, ensuring it's alive."""
    try:
        conn = db_pool.getconn()
        # Ping the connection to check if it's alive (often needed for Supabase idle timeout)

        try:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
        except (psycopg2.OperationalError, psycopg2.InterfaceError):
            print("Connection dead, removing from pool and getting a fresh one.")
            db_pool.putconn(conn, close=True)
            conn = db_pool.getconn()
        return conn
    except Exception:
        # Fallback: just return a regular connection if pool fails
        return psycopg2.connect(DATABASE_URL)

def release_db_connection(conn):
    """Puts back the connection into the pool."""
    try:
        db_pool.putconn(conn)
    except Exception:
        # If it wasn't from the pool, or the pool is broken, just close it.
        try:
            conn.close()
        except:
            pass
def close_db_pool():
    """Closes all connections in the pool."""
    try:
        db_pool.closeall()
    except Exception:
        pass

def increment_api_usage(service: str):
    """Increments the request count for a service on the current date."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO api_usage_stats (service, usage_date, request_count)
                VALUES (%s, CURRENT_DATE, 1)
                ON CONFLICT (service, usage_date)
                DO UPDATE SET request_count = api_usage_stats.request_count + 1
            """, (service,))
        conn.commit()
    except Exception as e:
        print(f"Error incrementing API usage: {e}")
        conn.rollback()
    finally:
        release_db_connection(conn)

def get_api_usage_stats():
    """Returns today's usage stats for Gemini services."""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT service, request_count
                FROM api_usage_stats
                WHERE usage_date = CURRENT_DATE
            """)
            return cur.fetchall()
    except Exception as e:
        print(f"Error fetching API usage stats: {e}")
        return []
    finally:
        release_db_connection(conn)
