/*
  Warnings:

  - The primary key for the `Analytics` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[Analytics] DROP CONSTRAINT [Analytics_pkey];
ALTER TABLE [dbo].[Analytics] ALTER COLUMN [id] BIGINT NOT NULL;
ALTER TABLE [dbo].[Analytics] ADD CONSTRAINT Analytics_pkey PRIMARY KEY CLUSTERED ([id]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
