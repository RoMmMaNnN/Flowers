ALTER TABLE "products"
ADD COLUMN "pricePence" INTEGER,
ADD COLUMN "isAvailable" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "product_images" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
);

INSERT INTO "product_images" ("id", "productId", "imageUrl", "storagePath", "sortOrder")
SELECT gen_random_uuid(), "id", "imageUrl", "imageUrl", 0
FROM "products"
WHERE "imageUrl" IS NOT NULL;

ALTER TABLE "product_images"
ADD CONSTRAINT "product_images_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "product_images_productId_sortOrder_idx" ON "product_images"("productId", "sortOrder");
ALTER TABLE "product_images"
ADD CONSTRAINT "product_images_sortOrder_nonnegative_chk" CHECK ("sortOrder" >= 0);
ALTER TABLE "product_images"
ADD CONSTRAINT "product_images_productId_sortOrder_key" UNIQUE ("productId", "sortOrder");
ALTER TABLE "products" DROP COLUMN "imageUrl";