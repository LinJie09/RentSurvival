-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "totalSalary" INTEGER NOT NULL DEFAULT 32000,
    "rent" INTEGER NOT NULL DEFAULT 8500,
    "savingsTarget" INTEGER NOT NULL DEFAULT 6200,
    "riskTarget" INTEGER NOT NULL DEFAULT 3200,
    "fixedCost" INTEGER NOT NULL DEFAULT 3000
);
INSERT INTO "new_Settings" ("fixedCost", "id", "rent", "savingsTarget", "totalSalary") SELECT "fixedCost", "id", "rent", "savingsTarget", "totalSalary" FROM "Settings";
DROP TABLE "Settings";
ALTER TABLE "new_Settings" RENAME TO "Settings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
