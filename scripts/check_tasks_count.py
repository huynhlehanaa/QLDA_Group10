import psycopg2
conn=psycopg2.connect(dbname='kpi_system',user='admin',password='secret123',host='localhost')
cur=conn.cursor()
cur.execute('SELECT count(*) FROM "TASKS";')
print('TASKS count:', cur.fetchone()[0])
cur.close(); conn.close()
