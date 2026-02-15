import React, { useState } from 'react';
import { View, Text, Button } from 'react-native';
import { Calendar, Agenda } from 'react-native-calendars';

const MyCalendar = () => {
  const today = new Date().toISOString().split('T')[0];
  const [selected, setSelected] = useState(today);

  const [items, setItems] = useState<Record<string, any[]>>({});

  const addEvent = () => {
    setItems(prevItems => {
      const newItems = { ...prevItems };
      if (!newItems[selected]) newItems[selected] = [];
      newItems[selected] = [
        ...newItems[selected],
        { name: `New Event on ${selected}`, height: 70 },
      ];
      return newItems;
    });
  };

  const markedDates = {
    [selected]: { selected: true, selectedColor: '#00adf5', selectedTextColor: '#fff' },
  };

  return (
    <View style={{ flex: 1 }}>
      <Calendar
        current={selected}
        onDayPress={day => setSelected(day.dateString)}
        markedDates={markedDates}
        theme={{
          selectedDayBackgroundColor: '#00adf5',
          todayTextColor: '#00adf5',
          arrowColor: '#00adf5',
          monthTextColor: '#00adf5',
        }}
      />

      <Button title="Add Event" onPress={addEvent} />

      <Agenda
        items={items}
        renderItem={item => (
          <View style={{ padding: 10, backgroundColor: 'white', marginBottom: 10, borderRadius: 5 }}>
            <Text>{item.name}</Text>
          </View>
        )}
        hideKnob={true}
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
