BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[TrailInfo] (
    [ID] INT NOT NULL IDENTITY(1,1),
    [ImageID] VARCHAR(50),
    [Pitch] FLOAT(53),
    [Yaw] FLOAT(53),
    [HoverText] TEXT,
    [TargetPitch] FLOAT(53),
    [TargetYaw] FLOAT(53),
    [TargetHFOV] FLOAT(53),
    [CSSClass] TEXT,
    CONSTRAINT [PK_TrailInfo] PRIMARY KEY CLUSTERED ([ID])
);

-- CreateTable
CREATE TABLE [dbo].[AdminAccount] (
    [Id] INT NOT NULL IDENTITY(1,1),
    [Username] NVARCHAR(1000) NOT NULL,
    [Password] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [AdminAccount_pkey] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [AdminAccount_Username_key] UNIQUE NONCLUSTERED ([Username])
);

-- CreateTable
CREATE TABLE [dbo].[Session] (
    [Id] NVARCHAR(1000) NOT NULL,
    [AdminAccountId] INT NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Session_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Session_pkey] PRIMARY KEY CLUSTERED ([Id])
);

-- CreateTable
CREATE TABLE [dbo].[Image] (
    [id] VARCHAR(50) NOT NULL,
    [originalLatitude] FLOAT(53) NOT NULL,
    [originalLongitude] FLOAT(53) NOT NULL,
    [latitude] FLOAT(53) NOT NULL,
    [longitude] FLOAT(53) NOT NULL,
    [bearing] FLOAT(53) NOT NULL,
    [flipped] BIT NOT NULL,
    [shtHash] NVARCHAR(1000) NOT NULL,
    [pitchCorrection] FLOAT(53) NOT NULL,
    [visibility] BIT NOT NULL,
    [sequenceId] INT NOT NULL,
    CONSTRAINT [Image_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Sequence] (
    [name] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL,
    [toDelete] BIT NOT NULL CONSTRAINT [Sequence_toDelete_df] DEFAULT 0,
    [id] INT NOT NULL IDENTITY(1,1),
    [isPublic] BIT CONSTRAINT [Sequence_isPublic_df] DEFAULT 1,
    CONSTRAINT [Sequence_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Sequence_name_key] UNIQUE NONCLUSTERED ([name])
);

-- AddForeignKey
ALTER TABLE [dbo].[Session] ADD CONSTRAINT [Session_AdminAccountId_fkey] FOREIGN KEY ([AdminAccountId]) REFERENCES [dbo].[AdminAccount]([Id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Image] ADD CONSTRAINT [Image_sequenceId_fkey] FOREIGN KEY ([sequenceId]) REFERENCES [dbo].[Sequence]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

