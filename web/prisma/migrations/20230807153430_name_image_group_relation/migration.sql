/*
  Warnings:

  - You are about to drop the `_GroupToImage` table. If the table is not empty, all the data it contains will be lost.

*/
BEGIN TRY

BEGIN TRAN;

-- DropForeignKey
ALTER TABLE [dbo].[_GroupToImage] DROP CONSTRAINT [_GroupToImage_A_fkey];

-- DropForeignKey
ALTER TABLE [dbo].[_GroupToImage] DROP CONSTRAINT [_GroupToImage_B_fkey];

-- DropTable
DROP TABLE [dbo].[_GroupToImage];

-- CreateTable
CREATE TABLE [dbo].[_ImageGroupRelation] (
    [A] INT NOT NULL,
    [B] VARCHAR(50) NOT NULL,
    CONSTRAINT [_ImageGroupRelation_AB_unique] UNIQUE NONCLUSTERED ([A],[B])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [_ImageGroupRelation_B_index] ON [dbo].[_ImageGroupRelation]([B]);

-- AddForeignKey
ALTER TABLE [dbo].[_ImageGroupRelation] ADD CONSTRAINT [_ImageGroupRelation_A_fkey] FOREIGN KEY ([A]) REFERENCES [dbo].[Group]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[_ImageGroupRelation] ADD CONSTRAINT [_ImageGroupRelation_B_fkey] FOREIGN KEY ([B]) REFERENCES [dbo].[Image]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
