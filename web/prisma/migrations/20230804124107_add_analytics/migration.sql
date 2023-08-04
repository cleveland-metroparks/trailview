BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[Analytics] (
    [id] INT NOT NULL IDENTITY(1,1),
    [imageId] VARCHAR(50) NOT NULL,
    [date] DATETIME2 NOT NULL,
    [count] INT NOT NULL,
    CONSTRAINT [Analytics_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[Analytics] ADD CONSTRAINT [Analytics_imageId_fkey] FOREIGN KEY ([imageId]) REFERENCES [dbo].[Image]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH