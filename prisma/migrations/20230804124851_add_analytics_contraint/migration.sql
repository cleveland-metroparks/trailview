/*
  Warnings:

  - A unique constraint covering the columns `[imageId,date]` on the table `Analytics` will be added. If there are existing duplicate values, this will fail.

*/
BEGIN TRY

BEGIN TRAN;

-- CreateIndex
ALTER TABLE [dbo].[Analytics] ADD CONSTRAINT [Analytics_imageId_date_key] UNIQUE NONCLUSTERED ([imageId], [date]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
