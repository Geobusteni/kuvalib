-- CreateTable
CREATE TABLE `Showcase` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `eventDate` DATETIME(3) NULL,
    `eventType` ENUM('WEDDING', 'BIRTHDAY', 'CHRISTENING', 'CORPORATE', 'GENERIC') NOT NULL DEFAULT 'GENERIC',
    `albumBg` ENUM('NEUTRAL', 'DEEP', 'ACCENT') NOT NULL DEFAULT 'NEUTRAL',
    `animationStyle` ENUM('TURN', 'FADE', 'ZOOM') NOT NULL DEFAULT 'TURN',
    `autoplay` BOOLEAN NOT NULL DEFAULT false,
    `autoplaySeconds` INTEGER NOT NULL DEFAULT 5,
    `playlistLoop` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Showcase_projectId_key`(`projectId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ShowcasePage` (
    `id` VARCHAR(191) NOT NULL,
    `showcaseId` VARCHAR(191) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `blocksJson` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ShowcasePage_showcaseId_idx`(`showcaseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ShowcaseTrack` (
    `id` VARCHAR(191) NOT NULL,
    `showcaseId` VARCHAR(191) NOT NULL,
    `filename` VARCHAR(191) NOT NULL,
    `originalName` VARCHAR(191) NOT NULL,
    `size` INTEGER NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ShowcaseTrack_showcaseId_idx`(`showcaseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Showcase` ADD CONSTRAINT `Showcase_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ShowcasePage` ADD CONSTRAINT `ShowcasePage_showcaseId_fkey` FOREIGN KEY (`showcaseId`) REFERENCES `Showcase`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ShowcaseTrack` ADD CONSTRAINT `ShowcaseTrack_showcaseId_fkey` FOREIGN KEY (`showcaseId`) REFERENCES `Showcase`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

