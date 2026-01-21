-- Fix collation issues for deactivation_reason
-- This script ensures the column and trigger work together properly

-- First, ensure the deactivation_reason column has the correct collation
ALTER TABLE `user` 
MODIFY COLUMN `deactivation_reason` TEXT CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT NULL 
COMMENT 'Reason for account deactivation';

-- Update the trigger to avoid collation conflicts
DELIMITER $$
DROP TRIGGER IF EXISTS `log_account_deactivation`$$
CREATE TRIGGER `log_account_deactivation` AFTER UPDATE ON `user` FOR EACH ROW 
BEGIN
    -- Check if status changed to deactivated
    IF OLD.account_status != 'deactivated' AND NEW.account_status = 'deactivated' THEN
        -- Send notification to the deactivated user
        INSERT INTO `notification` (`user_id`, `message`, `status_id`, `type_id`, `timestamp`)
        VALUES (
            NEW.id, 
            IF(
                NEW.deactivation_reason IS NOT NULL AND NEW.deactivation_reason != '',
                CONCAT('Your account has been deactivated. Reason: ', NEW.deactivation_reason, '. Please contact gym administration for more information.'),
                'Your account has been deactivated. Please contact gym administration for more information.'
            ),
            1, -- Unread
            2, -- Warning
            NOW()
        );
    END IF;
END$$
DELIMITER ;







