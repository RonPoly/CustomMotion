-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_RunHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "details" TEXT NOT NULL
);
INSERT INTO "new_RunHistory" ("details", "id", "timestamp") SELECT "details", "id", "timestamp" FROM "RunHistory";
DROP TABLE "RunHistory";
ALTER TABLE "new_RunHistory" RENAME TO "RunHistory";
CREATE TABLE "new_Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "estimate" INTEGER NOT NULL,
    "deadline" DATETIME,
    "tags" TEXT NOT NULL,
    "dependsOn" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Task" ("createdAt", "deadline", "dependsOn", "estimate", "id", "tags", "title", "updatedAt") SELECT "createdAt", "deadline", "dependsOn", "estimate", "id", "tags", "title", "updatedAt" FROM "Task";
DROP TABLE "Task";
ALTER TABLE "new_Task" RENAME TO "Task";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
