import unittest
from unittest.mock import MagicMock, patch, call
from reminder_display import print_reminders

class TestPrintReminders(unittest.TestCase):
    @patch('reminder_display.sleep', return_value=None)  # Patch sleep to avoid delay
    def test_print_reminders_order(self, mock_sleep):
        # Create a dummy LCD object
        dummy_lcd = MagicMock()
        # Patch the lcd in reminder_display to use our dummy
        with patch('reminder_display.lcd', dummy_lcd):
            # Use a simple array of reminder strings
            reminders = ["Get groceries", "Water plants", "Walk dog"]
            print_reminders(reminders)
            
            # Expected sequence: for each reminder, lcd.clear() then lcd.write_string(reminder)
            expected_calls = [
                call.clear(),
                call.write_string("Get groceries"),
                call.clear(),
                call.write_string("Water plants"),
                call.clear(),
                call.write_string("Walk dog")
            ]
            
            # Assert that the dummy LCD was called in the expected order
            self.assertEqual(dummy_lcd.mock_calls, expected_calls)

if __name__ == '__main__':
    unittest.main()
