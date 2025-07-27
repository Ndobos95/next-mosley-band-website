-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_GuestPayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "parentName" TEXT NOT NULL,
    "parentEmail" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "notes" TEXT,
    "stripePaymentIntentId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "matchedStudentId" TEXT,
    "matchedUserId" TEXT,
    "resolutionNotes" TEXT,
    "resolvedAt" DATETIME,
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "emailError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GuestPayment_matchedUserId_fkey" FOREIGN KEY ("matchedUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "GuestPayment_matchedStudentId_fkey" FOREIGN KEY ("matchedStudentId") REFERENCES "Student" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "GuestPayment_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "PaymentCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_GuestPayment" ("amount", "categoryId", "createdAt", "id", "matchedStudentId", "matchedUserId", "notes", "parentEmail", "parentName", "resolutionNotes", "resolvedAt", "status", "stripePaymentIntentId", "studentName", "updatedAt") SELECT "amount", "categoryId", "createdAt", "id", "matchedStudentId", "matchedUserId", "notes", "parentEmail", "parentName", "resolutionNotes", "resolvedAt", "status", "stripePaymentIntentId", "studentName", "updatedAt" FROM "GuestPayment";
DROP TABLE "GuestPayment";
ALTER TABLE "new_GuestPayment" RENAME TO "GuestPayment";
CREATE UNIQUE INDEX "GuestPayment_stripePaymentIntentId_key" ON "GuestPayment"("stripePaymentIntentId");
CREATE TABLE "new_Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "enrollmentId" TEXT NOT NULL,
    "stripePaymentIntentId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "parentEmail" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "emailError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "categoryId" TEXT NOT NULL,
    CONSTRAINT "Payment_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "PaymentCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Payment_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "StudentPaymentEnrollment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Payment" ("amount", "categoryId", "createdAt", "enrollmentId", "id", "notes", "parentEmail", "status", "stripePaymentIntentId", "studentName", "updatedAt") SELECT "amount", "categoryId", "createdAt", "enrollmentId", "id", "notes", "parentEmail", "status", "stripePaymentIntentId", "studentName", "updatedAt" FROM "Payment";
DROP TABLE "Payment";
ALTER TABLE "new_Payment" RENAME TO "Payment";
CREATE UNIQUE INDEX "Payment_stripePaymentIntentId_key" ON "Payment"("stripePaymentIntentId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
