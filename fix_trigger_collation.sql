-- Fix the trigger collation issue
-- This version avoids collation conflicts by using a simpler approach

DELIMITER $$
DROP TRIGGER IF EXISTS `log_account_deactivation`$$
CREATE TRIGGER `log_account_deactivation` AFTER UPDATE ON `user` FOR EACH ROW 
BEGIN
    -- Check if status changed to deactivated
    IF OLD.account_status != 'deactivated' AND NEW.account_status = 'deactivated' THEN
        -- Send notification to the deactivated user
        -- Use a variable to build the message to avoid collation issues
        SET @notification_message = IF(
            NEW.deactivation_reason IS NOT NULL AND NEW.deactivation_reason != '',
            CONCAT('Your account has been deactivated. Reason: ', NEW.deactivation_reason, '. Please contact gym administration for more information.'),
            'Your account has been deactivated. Please contact gym administration for more information.'
        );
        
        INSERT INTO `notification` (`user_id`, `message`, `status_id`, `type_id`, `timestamp`)
        VALUES (
            NEW.id, 
            @notification_message,
            1, -- Unread
            2, -- Warning
            NOW()
        );
        
        SET @notification_message = NULL;
    END IF;
END$$
DELIMITER ;







