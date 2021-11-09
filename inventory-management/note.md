# ロックはどう動くのか？

→

1. ２つのクライアントでそれぞれトランザクションを開始する。
2. client-A で id=1 のレコードに書き込みをする。
3. client-B で id=1 のレコードに書き込みをしようとすると待ち状態になる。

もし 3 で id=2 に書き込もうとすると、即時に成功する。ただし、id=1 で別のカラムだと待ち状態になる
--> レコードごとのロックされているみたいなので、書き込みが同じレコードで起こったとしても、データは壊れない。

https://www.postgresql.jp/document/8.4/html/explicit-locking.html の 13.3.2. 行レベルロック

※分離レベルは default の read-committed

## client-A

```sql
postgres=# begin;
BEGIN
postgres=*# UPDATE "Products" SET price = price + 1
        WHERE id = 1;
UPDATE 1

```

## client-B

```sql
postgres=# begin;
BEGIN
postgres=*# UPDATE "Products" SET price = price + 1
        WHERE id = 1;
【待ち】
```

# 在庫管理はどんな感じが良さそう？

SQL の実行が少ないのでパフォーマンス的に有利で、誤差も出ない Test1 が良さそう。
デメリットとしては、DB の CHECK CONSTRAINT を使うので、もし付いてないと壊れることくらい。

```python
def test1():
    global success_count, failure_count

    try:
        execute_query("""
            BEGIN;

            UPDATE "Products" SET inventories = inventories - 1
            WHERE id = 1;

            INSERT INTO "PurchasedItems" (id, product_id, user_name)
            VALUES (gen_random_uuid(), 1, 'test-user');

            COMMIT;
        """)
        success_count += 1
    except:
        failure_count += 1
```

---

Test 0
succeeded = 106
failed = 1894
average_time = 0.026294495224952696

---

Test 1
succeeded = 100
failed = 1900
average_time = 0.01542035710811615

---

Test 2
succeeded = 100
failed = 1900
average_time = 0.049793885111808774

---

Test 3
succeeded = 586
failed = 1414
average_time = 0.03241055417060852

---
