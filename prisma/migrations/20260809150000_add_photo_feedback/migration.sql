-- AlterTable
ALTER TABLE `Project` ADD COLUMN `feedbackEnabled` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `feedbackResetAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- CreateTable
CREATE TABLE `PhotoFeedback` (
    `id` VARCHAR(191) NOT NULL,
    `photoId` VARCHAR(191) NOT NULL,
    `visitorId` VARCHAR(191) NOT NULL,
    `type` ENUM('LIKE', 'DISLIKE', 'COMMENT') NOT NULL,
    `comment` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `PhotoFeedback_photoId_visitorId_key`(`photoId`, `visitorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PhotoFeedback` ADD CONSTRAINT `PhotoFeedback_photoId_fkey` FOREIGN KEY (`photoId`) REFERENCES `Photo`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
