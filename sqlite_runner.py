
import sqlite3, json, sys, io
sys.stdin = io.TextIOWrapper(sys.stdin.buffer, encoding='utf-8')
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
try:
    db_path = sys.argv[1]
    is_query = sys.argv[2] == 'true'
    sql = sys.stdin.read()
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute(sql)
    if is_query:
        columns = [col[0] for col in cursor.description] if cursor.description else []
        data = [dict(zip(columns, row)) for row in cursor.fetchall()]
        sys.stdout.write(json.dumps(data))
    else:
        conn.commit()
        sys.stdout.write(json.dumps({"success": True}))
except Exception as e:
    sys.stderr.write(str(e))
    sys.exit(1)
