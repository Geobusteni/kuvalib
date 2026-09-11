-- AlterTable
ALTER TABLE `Showcase` ADD COLUMN `customCss` TEXT NULL,
    ADD COLUMN `dotColorActive` VARCHAR(191) NULL,
    ADD COLUMN `dotColorInactive` VARCHAR(191) NULL,
    ADD COLUMN `headingSizes` JSON NULL,
    ADD COLUMN `textSizes` JSON NULL,
    MODIFY `animationStyle` ENUM('TURN', 'FADE', 'ZOOM', 'ROTATE') NOT NULL DEFAULT 'TURN';

-- AlterTable
ALTER TABLE `ShowcasePage` ADD COLUMN `bg` VARCHAR(191) NOT NULL DEFAULT 'none',
    ADD COLUMN `bgCustom` VARCHAR(191) NULL,
    ADD COLUMN `bgCustomAlpha` INTEGER NULL,
    ADD COLUMN `bgGradientAngle` INTEGER NULL,
    ADD COLUMN `bgGradientFrom` VARCHAR(191) NULL,
    ADD COLUMN `bgGradientTo` VARCHAR(191) NULL,
    ADD COLUMN `borderColor` VARCHAR(191) NULL,
    ADD COLUMN `borderStyle` VARCHAR(191) NOT NULL DEFAULT 'none',
    ADD COLUMN `borderWidth` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `kenBurns` VARCHAR(191) NOT NULL DEFAULT 'none',
    ADD COLUMN `kenBurnsSpeed` INTEGER NOT NULL DEFAULT 8;

