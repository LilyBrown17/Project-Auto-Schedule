import { Text, View } from "react-native";
import { Calendar } from 'react-native-calendars';

// Define a functional component called MyCalendar -- EDIT LATER [currently an example based on a tutorial]
const MyCalendar = () => {
    return (
        // Render a View container
        <View>
            {/* Render the Calendar component */}
            <Calendar
                // Mark specific dates with different styles and properties
                markedDates={{
                    '2023-02-07': { selected: true, marked: true }, // Selected and marked date
                    '2026-02-08': { marked: true }, // Only marked date
                    '2026-02-09': {
                        marked: true, // Marked date
                        dotColor: 'red', // Dot color for this date
                        activeOpacity: 0 // Opacity when pressed
                    },
                }}
                // Customize the appearance of the calendar using the theme prop
                theme={{
                    backgroundColor: '#ffffff', // Overall background color
                    calendarBackground: '#ffffff', // Calendar background color
                    textSectionTitleColor: '#b6c1cd', // Color for section titles (weekdays)
                    selectedDayBackgroundColor: '#00adf5', // Background color for selected day
                    selectedDayTextColor: '#ffffff', // Text color for selected day
                    todayTextColor: '#00adf5', // Text color for today's date
                    dayTextColor: '#2d4150', // Default day text color
                    textDisabledColor: '#d9e1e8', // Color for disabled days
                    dotColor: '#00adf5', // Default dot color
                    selectedDotColor: '#ffffff', // Dot color for selected day
                    arrowColor: '#00adf5', // Color for navigation arrows
                    monthTextColor: '#00adf5', // Color for month text
                    indicatorColor: 'blue', // Color for loading indicator
                    textDayFontFamily: 'monospace', // Font family for day numbers
                    textMonthFontFamily: 'monospace', // Font family for month text
                    textDayHeaderFontFamily: 'monospace', // Font family for day headers
                    textDayFontSize: 16, // Font size for day numbers
                    textMonthFontSize: 16, // Font size for month text
                    textDayHeaderFontSize: 16 // Font size for day headers
                }}
            />
        </View>
    );
};

export default function Index() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <MyCalendar />
    </View>
  );
}
