import React, { useState } from 'react';
import { View, Text, Button } from 'react-native';
import { Agenda } from 'react-native-calendars';

const MyCalendar = () => {
  const today = new Date().toISOString().split('T')[0];

  const [items, setItems] = useState<Record<string, any[]>>({ [today]: [] });
  const [selectedDate, setSelectedDate] = useState(today);

  const addEvent = () => {
    setItems(prevItems => {
      const dayItems = prevItems[selectedDate] || [];
      return {
        ...prevItems,
        [selectedDate]: [...dayItems, { name: `New Event on ${selectedDate}`, height: 70 }],
      };
    });
  };

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
