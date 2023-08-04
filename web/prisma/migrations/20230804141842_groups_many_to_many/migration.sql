/*
  Warnings:

  - You are about to drop the column `groupId` on the `Image` table. All the data in the column will be lost.

*/
BEGIN TRY

BEGIN TRAN;

-- DropForeignKey
ALTER TABLE [dbo].[Image] DROP CONSTRAINT [Image_groupId_fkey];

-- AlterTable
ALTER TABLE [dbo].[Image] DROP COLUMN [groupId];

-- CreateTable
CREATE TABLE [dbo].[_GroupToImage] (
    [A] INT NOT NULL,
    [B] VARCHAR(50) NOT NULL,
    CONSTRAINT [_GroupToImage_AB_unique] UNIQUE NONCLUSTERED ([A],[B])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [_GroupToImage_B_index] ON [dbo].[_GroupToImage]([B]);

-- AddForeignKey
ALTER TABLE [dbo].[_GroupToImage] ADD CONSTRAINT [_GroupToImage_A_fkey] FOREIGN KEY ([A]) REFERENCES [dbo].[Group]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[_GroupToImage] ADD CONSTRAINT [_GroupToImage_B_fkey] FOREIGN KEY ([B]) REFERENCES [dbo].[Image]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
