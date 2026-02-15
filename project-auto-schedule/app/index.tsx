import React, { useState, useMemo } from 'react';
import { View, Text, Button } from 'react-native';
import { Agenda } from 'react-native-calendars';

const MyCalendar = () => {
  const today = new Date().toISOString().split('T')[0];

  const [items, setItems] = useState<Record<string, any[]>>({});
  const [selectedDate, setSelectedDate] = useState(today);

  const addEvent = () => {
    setItems(prevItems => {
      const dayItems = prevItems[selectedDate] || [];

      if (dayItems.length > 0 && prevItems[selectedDate] === dayItems) {
        dayItems.push({ name: `New Event on ${selectedDate}`, height: 70 });
        return prevItems;
      }

      return {
        ...prevItems,
        [selectedDate]: [
          ...dayItems,
          { name: `New Event on ${selectedDate}`, height: 70 },
        ],
      };
    });
  };

  const markedDates = useMemo(() => {
    const marks: Record<string, { selected?: boolean; marked?: boolean; selectedColor?: string }> = {};

    Object.keys(items).forEach(date => {
      if (items[date]?.length > 0) {
        marks[date] = { marked: true, selectedColor: '#00adf5' };
      }
    });

    if (!marks[selectedDate]) marks[selectedDate] = {};
    marks[selectedDate].selected = true;
    marks[selectedDate].selectedColor = '#00adf5';

    return marks;
  }, [items, selectedDate]);

  return (
    <View style={{ flex: 1 }}>
      <Button title="Add Event" onPress={addEvent} />

      <Agenda
        items={items}
        selected={selectedDate}
        onDayPress={(day) => setSelectedDate(day.dateString)}
        renderItem={(item) => (
          <View
            style={{
              padding: 10,
              backgroundColor: 'white',
              marginBottom: 10,
              borderRadius: 5,
            }}
          >
            <Text>{item.name}</Text>
          </View>
        )}
        hideKnob={false}
        markedDates={markedDates}
      />
    </View>
  );
};

export default function Index() {
  return (
    <View style={{ flex: 1 }}>
      <MyCalendar />
    </View>
  );
}
