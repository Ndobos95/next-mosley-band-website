/*
  Warnings:

  - You are about to drop the column `verified` on the `StudentParent` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `StudentParent` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_StudentParent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StudentParent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StudentParent_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_StudentParent" ("createdAt", "id", "studentId", "userId") SELECT "createdAt", "id", "studentId", "userId" FROM "StudentParent";
DROP TABLE "StudentParent";
ALTER TABLE "new_StudentParent" RENAME TO "StudentParent";
CREATE UNIQUE INDEX "StudentParent_userId_studentId_key" ON "StudentParent"("userId", "studentId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
