import sqlite3
import os

db_path = 'brain.db'
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    try:
        cursor.execute("PRAGMA table_info(orders)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'quantity' not in columns:
            print("Adding quantity column to orders...")
            cursor.execute("ALTER TABLE orders ADD COLUMN quantity INTEGER DEFAULT 1")
            conn.commit()
            print("DB Upgrade Success!")
        else:
            print("DB Schema already up to date.")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()
else:
    print("brain.db not found.")
