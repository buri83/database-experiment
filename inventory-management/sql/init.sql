DROP TABLE IF EXISTS "Products" CASCADE;
CREATE TABLE "Products"
(
    id INTEGER PRIMARY KEY NOT NULL,
    "name" TEXT NOT NULL,
    inventories INTEGER CHECK (inventories >= 0) NOT NULL,
    price INTEGER NOT NULL
);

INSERT INTO "Products" (id, "name", inventories, price)
VALUES
    (0, 'タンスの辺', 0, 1500),
    (1, 'かまぼこ専用スプーン', 1000, 1500),
    (2, 'マイクロビックコーン', 0, 51),
    (3, 'スペシャルジェネラル', 0, 124),
    (4, 'AsepticMushroom', 0, 51);


DROP TABLE IF EXISTS "PurchasedItems" CASCADE;
CREATE TABLE "PurchasedItems"
(
    id UUID PRIMARY KEY NOT NULL,
    product_id INTEGER REFERENCES "Products"(id) NOT NULL,
    user_name TEXT NOT NULL
);