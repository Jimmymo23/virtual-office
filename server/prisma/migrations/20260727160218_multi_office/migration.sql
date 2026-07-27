/*
  Warnings:

  - A unique constraint covering the columns `[officeId,x,y,layer]` on the table `MapTile` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'SUPERADMIN';

-- DropIndex
DROP INDEX "MapTile_x_y_layer_key";

-- AlterTable
ALTER TABLE "AttendanceLog" ADD COLUMN     "officeId" TEXT;

-- AlterTable
ALTER TABLE "MapTile" ADD COLUMN     "officeId" TEXT;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "officeId" TEXT;

-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "officeId" TEXT;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "officeId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "officeId" TEXT;

-- CreateTable
CREATE TABLE "Office" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Office_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Office_slug_key" ON "Office"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "MapTile_officeId_x_y_layer_key" ON "MapTile"("officeId", "x", "y", "layer");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE SET NULL ON UPDATE CASCADE;
