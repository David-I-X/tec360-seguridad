import psycopg2
conn = psycopg2.connect('postgresql://admin:password123@localhost:5432/tec360')
conn.autocommit = True
cur = conn.cursor()
try:
    cur.execute("ALTER TYPE servicetype ADD VALUE 'vehicle_recovery';")
    print('ENUM updated successfully.')
except psycopg2.errors.DuplicateObject:
    print('ENUM already has vehicle_recovery.')
finally:
    cur.close()
    conn.close()
