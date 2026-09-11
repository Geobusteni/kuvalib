-- AlterTable
ALTER TABLE `Showcase` ADD COLUMN `colorPresets` JSON NULL,
    MODIFY `autoplay` BOOLEAN NOT NULL DEFAULT true;
