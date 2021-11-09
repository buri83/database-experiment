import psycopg2
from psycopg2.extras import DictCursor
import time
import random
from concurrent.futures import ThreadPoolExecutor
import uuid

postgres_url = "postgresql://{username}:{password}@{hostname}:{port}/{database}".format(
    username="postgres",
    password="password",
    hostname="postgres",
    port=5432,
    database="postgres"
)

# Setting
EXPECTED_SUCCESS = 100
VISITING_USERS = 2000
VISITING_DURATION_SECS = 10


success_count = 0
failure_count = 0
times = []

def reset_counts():
    global success_count, failure_count, times
    success_count = 0
    failure_count = 0
    times = []

def execute_query(sql, params=None):
    db_latency_ms = 20

    results = None
    with psycopg2.connect(postgres_url) as conn:
        with conn.cursor(cursor_factory=DictCursor) as cur:
            time.sleep(db_latency_ms / 1000 / 2)
            cur.execute(sql, params)
            try:
                results = [dict(r) for r in cur.fetchall()]
            except:
                pass
            time.sleep(db_latency_ms / 1000 / 2)
    return results

def test0():
    global success_count, failure_count
    count = execute_query("""
        SELECT inventories FROM "Products" WHERE id = 0;
    """)[0]["inventories"]

    if count <= EXPECTED_SUCCESS:
        execute_query("""
            BEGIN;

            UPDATE "Products" SET inventories = inventories + 1
            WHERE id = 0;

            INSERT INTO "PurchasedItems" (id, product_id, user_name)
            VALUES
                (gen_random_uuid(), 0, 'test-user');

            COMMIT;
        """)
        success_count += 1
    else:
        failure_count += 1

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


def test2():
    global success_count, failure_count
    item_id = uuid.uuid4()

    execute_query("""
            BEGIN;

            INSERT INTO "PurchasedItems" (id, product_id, user_name)
            SELECT '{item_id}', 2, 'test-user'
            FROM "Products"
            WHERE id = 2 AND inventories < {max};

            UPDATE "Products" SET inventories = inventories + 1
            WHERE id = 2 AND inventories < {max};

            COMMIT;
        """.format(item_id=item_id, max=EXPECTED_SUCCESS))

    success = execute_query("""
        SELECT EXISTS (SELECT 1 FROM "PurchasedItems" WHERE id = '{}') AS result;
    """.format(item_id))[0]["result"]

    if success:
        success_count += 1
    else:
        failure_count += 1

def test3():
    global success_count, failure_count
    count = execute_query("""
        SELECT inventories FROM "Products" WHERE id = 3;
    """)[0]["inventories"]

    if count <= EXPECTED_SUCCESS:
        execute_query("""
            BEGIN;

            UPDATE "Products" SET inventories = {} + 1
            WHERE id = 3;

            INSERT INTO "PurchasedItems" (id, product_id, user_name)
            VALUES
                (gen_random_uuid(), 3, 'test-user');

            COMMIT;
        """.format(count))
        success_count += 1
    else:
        failure_count += 1


def run_with_random_delay(fn):
    global times
    max_delay_s = VISITING_DURATION_SECS

    time.sleep(random.random() * max_delay_s)

    st = time.time()
    fn()
    times.append(time.time() - st)


def start_test(fn):
    with ThreadPoolExecutor(max_workers=VISITING_USERS) as tpe:
        for i in range(VISITING_USERS):
            tpe.submit(run_with_random_delay, fn)
        tpe.shutdown()


"""
    # 状況
    ある10秒間に、2000ユーザーが購入しようとする。
    上限は1000個までの商品である

    また、DB操作には20msのレイテンシが発生している
"""

print("----------------------------\n")

# Test 0: 
# 在庫データを取得した後、クライアントサイドで在庫数が100を超えてないか確認する。
# 問題無いと判断できたら在庫数を 1 増やし、購入を確定する。
# 成功の判断: クライアントサイドで100を超えてないことを確認できた
"""
    --> 結果、誤差が出てくる。DBのレイテンシが大きいと誤差がでかくなる。
    誤差が出るのは「上限未満→上限になる瞬間」だけで、かつこの瞬間に同時にアクセスした人数が上限（値取得→値参照までの時間が十分長いとき）
    であるので、あんまり気にしなくて良さそう。
"""
reset_counts()
start_test(test0)

print("Test 0")
print("succeeded = %s" % success_count)
print("failed = %s" % failure_count)
print("average_time = %s" % (sum(times) / len(times)))
print("----------------------------\n")


# Test 1: 
# 同じトランザクションの中で在庫を1減らし、購入を行う。
# Check constraint で 0未満にはできないため、在庫を使い切ると exception が発生する。
# 成功の判断: Exception が発生しなかった
"""
    --> 誤差でない。
"""

reset_counts()
execute_query("""
    UPDATE "Products" SET inventories = {} WHERE id = 1;
""".format(EXPECTED_SUCCESS))

start_test(test1)

print("Test 1")
print("succeeded = %s" % success_count)
print("failed = %s" % failure_count)
print("average_time = %s" % (sum(times) / len(times)))
print("----------------------------\n")


# Test 2:
# 同じトランザクションで在庫が上限に達していなければ、在庫を1増やし、購入を確定する（ID はクライアント側で事前に生成する）
# 成功の判断: ID が挿入できたことを確認できた
"""
    --> 誤差出る場合がある。トランザクション分離レベルが read committed だからかも？（ファントム、non-repeatable read が発生してるかも）
    また、userを10kにすると減った
"""
reset_counts()
start_test(test2)

print("Test 2")
print("succeeded = %s" % success_count)
print("failed = %s" % failure_count)
print("average_time = %s" % (sum(times) / len(times)))
print("----------------------------\n")


# Test 3: 
# 在庫データを取得した後、クライアントサイドで在庫数が100を超えてないか確認する。
# 問題無いと判断できたら在庫数を、count + 1 に更新し、購入を確定する。
# 成功の判断: クライアントサイドで100を超えてないことを確認できた
"""
    --> 結果、めっちゃ誤差出る。誤差は累積する
"""
reset_counts()
start_test(test3)

print("Test 3")
print("succeeded = %s" % success_count)
print("failed = %s" % failure_count)
print("average_time = %s" % (sum(times) / len(times)))
print("----------------------------\n")
